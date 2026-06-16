import { supabase } from "./auth";

const getMissingConfigError = () => ({
  data: null,
  error: new Error("Supabase n’est pas configuré. Vérifiez VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY."),
});

export const createContactRequest = async ({ userId, name, email, company, projectType, message }) => {
  if (!supabase) {
    return getMissingConfigError();
  }

  return supabase.from("contact_requests").insert({
    user_id: userId ?? null,
    name,
    email,
    company: company || null,
    project_type: projectType,
    message,
    status: "new",
  });
};

export const getContactRequestsForUser = async (userId) => {
  if (!supabase) {
    return getMissingConfigError();
  }

  if (!userId) {
    return { data: [], error: null };
  }

  return supabase
    .from("contact_requests")
    .select("id, project_type, message, status, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
};
