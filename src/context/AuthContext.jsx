import { useEffect, useMemo, useState } from "react";
import {
  getCurrentSession,
  isSupabaseConfigured,
  onAuthStateChange,
  signInWithEmail,
  signInWithGoogle,
  signOut,
  signUpWithEmail,
} from "../services/auth";
import { AuthContext } from "./auth-context";

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [authToast, setAuthToast] = useState("");

  useEffect(() => {
    let isMounted = true;

    getCurrentSession().then(({ data }) => {
      if (isMounted) {
        setSession(data?.session ?? null);
        setIsAuthLoading(false);
      }
    });

    const subscription = onAuthStateChange((event, nextSession) => {
      setSession(nextSession);
      setIsAuthLoading(false);

      if (event === "SIGNED_IN") {
        setAuthToast("Connexion réussie.");
      }

      if (event === "SIGNED_OUT") {
        setAuthToast("Déconnexion réussie.");
      }
    });

    return () => {
      isMounted = false;
      subscription?.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!authToast) {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => setAuthToast(""), 3400);

    return () => window.clearTimeout(timeoutId);
  }, [authToast]);

  const value = useMemo(
    () => ({
      session,
      user: session?.user ?? null,
      isAuthenticated: Boolean(session),
      isAuthLoading,
      authToast,
      clearAuthToast: () => setAuthToast(""),
      showAuthToast: setAuthToast,
      isSupabaseConfigured,
      signInWithGoogle,
      signUpWithEmail,
      signInWithEmail,
      logout: signOut,
    }),
    [authToast, isAuthLoading, session],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
