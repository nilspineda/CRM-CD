import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabase";
import { getEffectiveAccess } from "./permissions";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let mounted = true;
    let initialized = false;

    const init = async () => {
      if (initialized) return;
      initialized = true;

      try {
        const { data: { session: currentSession } } = await supabase.auth.getSession();
        
        if (!mounted) return;

        if (currentSession?.user) {
          setSession(currentSession);
          setUser(currentSession.user);
          
          try {
            const { data: profileData } = await supabase
              .from("profiles")
              .select("id,role_key,full_name")
              .eq("id", currentSession.user.id)
              .maybeSingle();
            
            if (mounted) setProfile(profileData);
          } catch (e) {
            console.warn("Profile fetch error:", e);
          }
        }
      } catch (e) {
        console.error("Auth init error:", e);
        if (mounted) setError(e);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    const timeoutId = setTimeout(() => {
      console.warn("Auth init timeout");
      if (mounted) setLoading(false);
    }, 5000);

    init();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, newSession) => {
      if (!mounted) return;
      
      if (event === "SIGNED_IN" && newSession?.user) {
        setSession(newSession);
        setUser(newSession.user);
        
        supabase
          .from("profiles")
          .select("id,role_key,full_name")
          .eq("id", newSession.user.id)
          .maybeSingle()
          .then(({ data }) => setProfile(data));
      } else if (event === "SIGNED_OUT") {
        setSession(null);
        setUser(null);
        setProfile(null);
      }
    });

    return () => {
      mounted = false;
      clearTimeout(timeoutId);
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

      const newUser = data.session?.user ?? null;
      setSession(data.session ?? null);
      setUser(newUser);

      if (newUser) {
        const { data: profileData } = await supabase
          .from("profiles")
          .select("id,role_key,full_name")
          .eq("id", newUser.id)
          .maybeSingle();
        setProfile(profileData);
      }

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

    const { data } = await supabase
      .from("profiles")
      .select("id,role_key,full_name")
      .eq("id", user.id)
      .maybeSingle();
    
    setProfile(data);
    return data;
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
