// LOT NOTIFY-01A — the three RPC calls of the worker, with the service_role key (server only).
// The key can only execute public.notify_01a_claim / _mark / _reconcile for this purpose: the
// outbox itself is in a private schema without any grant.
import { createClient } from "@supabase/supabase-js";

const rpcError = (fn, error) => {
  const failure = new Error(`supabase rpc ${fn} failed: ${error?.code || "error"}`);
  failure.code = error?.code || "rpc_error";
  return failure;
};

export const createSupabaseRpc = ({ supabaseUrl, serviceKey, fetchImpl }) => {
  const client = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: fetchImpl ? { fetch: fetchImpl } : undefined,
  });

  const call = async (fn, args) => {
    const { data, error } = await client.rpc(fn, args);
    if (error) throw rpcError(fn, error);
    return data;
  };

  return {
    claim: async (limit) => (await call("notify_01a_claim", { p_limit: limit })) ?? [],
    mark: (row, outcome, sha) =>
      call("notify_01a_mark", {
        p_outbox_id: row.outbox_id,
        p_attempts: row.attempts,
        p_result: outcome.result,
        p_resend_id: outcome.id ?? null,
        p_error: outcome.error ?? null,
        p_payload_sha256: sha ?? null,
      }),
    reconcile: () => call("notify_01a_reconcile", {}),
  };
};
