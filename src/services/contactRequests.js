import { supabase } from "./auth";

const getMissingConfigError = () => ({
  data: null,
  error: new Error("Supabase n’est pas configuré. Vérifiez VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY."),
});

const formatReference = (count) => `DL-2026-${String(count).padStart(4, "0")}`;

const createFallbackReference = () => formatReference(Number(String(Date.now()).slice(-4)));

export const createProjectReference = async () => {
  if (!supabase) {
    return createFallbackReference();
  }

  const { count, error } = await supabase
    .from("contact_requests")
    .select("id", { count: "exact", head: true });

  if (error) {
    return createFallbackReference();
  }

  return formatReference((count ?? 0) + 1);
};

export const createContactRequest = async ({ userId, name, email, company, projectType, message }) => {
  if (!supabase) {
    return getMissingConfigError();
  }

  const reference = await createProjectReference();

  return supabase.from("contact_requests").insert({
    user_id: userId ?? null,
    reference,
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
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
};

export const getAllContactRequests = async () => {
  if (!supabase) {
    return getMissingConfigError();
  }

  return supabase
    .from("contact_requests")
    .select("*")
    .order("created_at", { ascending: false });
};

export const updateContactRequestStatus = async ({ requestId, status }) => {
  if (!supabase) {
    return getMissingConfigError();
  }

  const allowedStatuses = ["new", "in_progress", "completed"];

  if (!allowedStatuses.includes(status)) {
    return {
      data: null,
      error: new Error("Statut invalide. Valeurs autorisées : new, in_progress, completed."),
    };
  }

  return supabase
    .from("contact_requests")
    .update({ status })
    .eq("id", requestId);
};
