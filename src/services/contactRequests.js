import { supabase } from "./auth";

const getMissingConfigError = () => ({
  data: null,
  error: new Error("Supabase n’est pas configuré. Vérifiez VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY."),
});

// LOT WEB-CONTACT-SIMPLE-01 — the public site no longer creates contact requests (the contact form
// was replaced by direct e-mail). Existing requests stay readable by their owner and the admin.

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
