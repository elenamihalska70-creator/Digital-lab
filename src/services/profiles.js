import { supabase } from "./auth";

const getMissingConfigError = () => ({
  data: null,
  error: new Error("Supabase n’est pas configuré. Vérifiez VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY."),
});

export const getProfileForUser = async (userId) => {
  if (!supabase) {
    return getMissingConfigError();
  }

  if (!userId) {
    return { data: null, error: null };
  }

  return supabase.from("profiles").select("role,email").eq("id", userId).single();
};
