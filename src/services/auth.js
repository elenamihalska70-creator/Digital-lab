import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase = isSupabaseConfigured ? createClient(supabaseUrl, supabaseAnonKey) : null;

const getMissingConfigError = () => ({
  data: null,
  error: new Error("Supabase n’est pas configuré. Ajoutez VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY."),
});

export const getCurrentSession = async () => {
  if (!supabase) {
    return getMissingConfigError();
  }

  return supabase.auth.getSession();
};

export const onAuthStateChange = (callback) => {
  if (!supabase) {
    return { unsubscribe: () => {} };
  }

  const { data } = supabase.auth.onAuthStateChange((event, session) => {
    callback(event, session);
  });

  return data.subscription;
};

export const signInWithGoogle = async () => {
  if (!supabase) {
    return getMissingConfigError();
  }

  return supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: window.location.origin,
    },
  });
};

export const signUpWithEmail = async ({ email, password }) => {
  if (!supabase) {
    return getMissingConfigError();
  }

  return supabase.auth.signUp({ email, password });
};

export const signInWithEmail = async ({ email, password }) => {
  if (!supabase) {
    return getMissingConfigError();
  }

  return supabase.auth.signInWithPassword({ email, password });
};

export const signOut = async () => {
  if (!supabase) {
    return getMissingConfigError();
  }

  return supabase.auth.signOut();
};
