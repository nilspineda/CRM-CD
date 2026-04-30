import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js/cors";

type InvitePayload = {
  email?: string;
  full_name?: string;
  role_key?: string;
  permissions?: string[];
  redirect_to?: string;
};

const json = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (request.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

  if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey) {
    return json({ error: "Supabase env vars are missing" }, 500);
  }

  const authHeader = request.headers.get("Authorization");
  if (!authHeader) {
    return json({ error: "Unauthorized" }, 401);
  }

  const userClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: { Authorization: authHeader },
    },
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  const { data: userResult, error: userError } = await userClient.auth.getUser();
  if (userError || !userResult.user) {
    return json({ error: "Unauthorized" }, 401);
  }

  const { data: profile, error: profileError } = await adminClient
    .from("profiles")
    .select("role_key")
    .eq("id", userResult.user.id)
    .maybeSingle();

  if (profileError) {
    return json({ error: profileError.message }, 400);
  }

  if (profile?.role_key !== "SuperAdmin") {
    return json({ error: "Forbidden" }, 403);
  }

  const payload = (await request.json()) as InvitePayload;
  const email = payload.email?.trim().toLowerCase();

  if (!email) {
    return json({ error: "Email is required" }, 400);
  }

  const redirectTo =
    payload.redirect_to?.trim() || `${new URL(request.url).origin}/login`;

  const { data: inviteData, error: inviteError } =
    await adminClient.auth.admin.inviteUserByEmail(email, {
      redirectTo,
      data: {
        full_name: payload.full_name || "",
        role_key: payload.role_key || "Auxiliar",
        permissions: payload.permissions || [],
      },
    });

  if (inviteError) {
    return json({ error: inviteError.message }, 400);
  }

  const invitedUser = inviteData.user;

  if (invitedUser) {
    const { error: profileUpsertError } = await adminClient
      .from("profiles")
      .upsert(
        {
          id: invitedUser.id,
          email,
          full_name: payload.full_name || email,
          role_key: payload.role_key || "Auxiliar",
          permissions: payload.permissions || [],
          invited_by: userResult.user.id,
          invited_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "id",
        },
      );

    if (profileUpsertError) {
      return json({ error: profileUpsertError.message }, 400);
    }
  }

  return json({ data: inviteData });
});