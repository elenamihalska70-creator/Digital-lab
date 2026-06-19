import { supabase } from "./auth";

const getMissingConfigError = () => ({
  data: null,
  error: new Error("Supabase n’est pas configuré. Vérifiez VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY."),
});

const getReadColumnForRole = (viewerRole) => (viewerRole === "admin" ? "read_by_admin" : "read_by_client");

const getUnreadSenderRole = (viewerRole) => (viewerRole === "admin" ? "client" : "admin");

export const getUnreadMessageCounts = async ({ requestIds, viewerRole }) => {
  if (!supabase) {
    return getMissingConfigError();
  }

  if (!requestIds?.length) {
    return { data: {}, error: null };
  }

  const readColumn = getReadColumnForRole(viewerRole);

  const { data, error } = await supabase
    .from("request_messages")
    .select(`id, request_id, sender_role, ${readColumn}`)
    .in("request_id", requestIds)
    .eq("sender_role", getUnreadSenderRole(viewerRole))
    .eq(readColumn, false);

  if (error) {
    return { data: {}, error };
  }

  const counts = (data ?? []).reduce((accumulator, message) => {
    accumulator[message.request_id] = (accumulator[message.request_id] ?? 0) + 1;
    return accumulator;
  }, {});

  return { data: counts, error: null };
};

export const markRequestMessagesAsRead = async ({ requestId, viewerRole }) => {
  if (!supabase) {
    return getMissingConfigError();
  }

  if (!requestId || !viewerRole) {
    return { data: null, error: null };
  }

  const readColumn = getReadColumnForRole(viewerRole);
  const senderRole = getUnreadSenderRole(viewerRole);
  const readPayload = viewerRole === "client" ? { read_by_client: true } : { read_by_admin: true };

  return supabase
    .from("request_messages")
    .update(readPayload)
    .eq("request_id", requestId)
    .eq("sender_role", senderRole)
    .eq(readColumn, false);
};
