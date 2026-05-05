import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabase";
import { getEffectiveAccess } from "./permissions";

const AuthContext = createContext(null);

async function fetchProfile(user) {
  if (!user) return null;

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (error) {
    const missingTable =
      error.code === "42P01" ||
      error.message?.toLowerCase().includes("does not exist");
    if (!missingTable) {
      throw error;
    }

    return null;
  }

  return data || null;
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let mounted = true;
    let bootstrapped = false;

    const finishBootstrap = () => {
      if (mounted && !bootstrapped) {
        bootstrapped = true;
        setLoading(false);
      }
    };

    const bootstrapSession = async () => {
      try {
        const { data, error: sessionError } = await supabase.auth.getSession();

        if (!mounted) return;
        if (sessionError) throw sessionError;

        const nextSession = data.session ?? null;
        const nextUser = nextSession?.user ?? null;
        const nextProfile = await fetchProfile(nextUser);

        if (!mounted) return;

        setSession(nextSession);
        setUser(nextUser);
        setProfile(nextProfile);
        setError(null);
      } catch (authError) {
        if (!mounted) return;

        setError(authError);
        setSession(null);
        setUser(null);
        setProfile(null);
      } finally {
        finishBootstrap();
      }
    };

    const bootstrapTimeout = window.setTimeout(finishBootstrap, 4000);

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, nextSession) => {
      try {
        const nextUser = nextSession?.user ?? null;
        const nextProfile = await fetchProfile(nextUser);

        if (!mounted) return;

        setSession(nextSession ?? null);
        setUser(nextUser);
        setProfile(nextProfile);
        setError(null);
      } catch (authError) {
        if (!mounted) return;
        setError(authError);
        setSession(nextSession ?? null);
        setUser(nextSession?.user ?? null);
        setProfile(null);
      } finally {
        finishBootstrap();
      }
    });

    bootstrapSession();

    return () => {
      mounted = false;
      window.clearTimeout(bootstrapTimeout);
      subscription.unsubscribe();
    };
  }, []);

  const access = useMemo(
    () => getEffectiveAccess({ user, profile }),
    [user, profile],
  );

  const signIn = async ({ email, password }) => {
    setLoading(true);
    setError(null);

    try {
      const { data, error: signInError } =
        await supabase.auth.signInWithPassword({
          email,
          password,
        });

      if (signInError) throw signInError;

      setSession(data.session ?? null);
      setUser(data.session?.user ?? null);
      setProfile(await fetchProfile(data.session?.user ?? null));

      return data.session;
    } catch (signInError) {
      setError(signInError);
      throw signInError;
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    setLoading(true);
    setError(null);

    try {
      const { error: signOutError } = await supabase.auth.signOut();
      if (signOutError) throw signOutError;

      setSession(null);
      setUser(null);
      setProfile(null);
    } catch (signOutError) {
      setError(signOutError);
      throw signOutError;
    } finally {
      setLoading(false);
    }
  };

  const refreshProfile = async () => {
    if (!user) {
      setProfile(null);
      return null;
    }

    const nextProfile = await fetchProfile(user);
    setProfile(nextProfile);
    return nextProfile;
  };

  const value = {
    session,
    user,
    profile,
    access,
    loading,
    error,
    signIn,
    signOut,
    refreshProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth debe usarse dentro de AuthProvider");
  }

  return context;
}
