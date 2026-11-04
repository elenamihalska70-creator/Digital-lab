/* global process */
// LOT NOTIFY-01A — scheduled catch-up of the notification outbox (Vercel Cron, see vercel.json).
//
// Vercel calls it with "Authorization: Bearer $CRON_SECRET". On the Hobby plan each cron expression
// may run at most once a day, at any minute of the scheduled hour: vercel.json therefore declares
// four daily entries (01, 07, 13, 19 h UTC), i.e. one run every ~6 h (±59 min), which keeps several
// retries inside the 23 h idempotency window. Delivery is best effort (a run can be missed or
// delivered twice) and a failed run is not retried: this job is idempotent and reconciliation-based
// (everything due is processed, whatever happened before).
//
// Steps: reconcile (re-enqueue requests saved since cutover_at without an outbox row), then up to
// LIMITS.cronRounds × LIMITS.cronBatch notifications within the caps, then a counters-only report.
import { LIMITS, readNotifyConfig } from "../_lib/notify/config.js";
import { reply, safeEqual } from "../_lib/notify/http.js";
import { createSupabaseRpc } from "../_lib/notify/supabase.js";
import { processOutbox } from "../_lib/notify/worker.js";

export const createNotifyCronHandler = ({ env = process.env, makeRpc = createSupabaseRpc, send, now = () => Date.now() } = {}) =>
  async function handler(request, response) {
    if (request.method !== "GET") {
      return reply(response, 405, { ok: false, error: "method_not_allowed" }, { Allow: "GET" });
    }
    const secret = String(env.CRON_SECRET || "");
    if (secret.length < LIMITS.cronSecretMinLength) {
      console.error("[notify-01a] cron: CRON_SECRET missing or too short");
      return reply(response, 503, { ok: false, error: "unavailable" });
    }
    if (!safeEqual(String(request.headers?.authorization || ""), `Bearer ${secret}`)) {
      return reply(response, 401, { ok: false, error: "unauthorized" });
    }

    const settings = readNotifyConfig(env);
    if (!settings.ok) {
      console.error("[notify-01a] cron: not configured:", settings.problems.join(", "));
      return reply(response, 503, { ok: false, error: "unavailable", missing: settings.problems });
    }

    const started = now();
    const totals = { claimed: 0, sent: 0, retry: 0, dead: 0, stale: 0, skipped: 0, mark_errors: 0 };
    try {
      const rpc = makeRpc(settings.config);
      const reconcile = await rpc.reconcile();
      for (let round = 0; round < LIMITS.cronRounds; round += 1) {
        const remaining = LIMITS.cronBudgetMs - (now() - started);
        if (remaining <= 0) break;
        const summary = await processOutbox({
          rpc, config: settings.config, limit: LIMITS.cronBatch, budgetMs: remaining, now, ...(send ? { send } : {}),
        });
        for (const key of Object.keys(totals)) totals[key] += summary[key];
        if (summary.claimed < LIMITS.cronBatch) break;
      }
      const after = await rpc.reconcile();
      console.info("[notify-01a] cron", JSON.stringify({ before: reconcile, processed: totals, after }));
      return reply(response, 200, { ok: true, before: reconcile, processed: totals, after });
    } catch (error) {
      console.error("[notify-01a] cron failed:", error.code ?? error.name ?? "error");
      return reply(response, 500, { ok: false, error: "cron_failed", processed: totals });
    }
  };

export default createNotifyCronHandler();
