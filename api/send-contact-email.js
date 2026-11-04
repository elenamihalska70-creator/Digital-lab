/* global process */
// LOT NOTIFY-01A — this route is NO LONGER an e-mail relay.
//
// Before: the browser posted the visitor's fields here and the route e-mailed them (anyone could
// send any content to contact@ through it). Now the request body is never read: the route only
// wakes up the notification worker, which sends the notifications of requests ALREADY SAVED in
// Supabase (outbox notify_01a.outbox, filled by a database trigger) to the two fixed recipients.
//
// The path is kept because the unchanged frontend (src/App.jsx, ContactForm) calls it right after
// saving a request: that call triggers an immediate notification. If it never comes, the daily
// cron (api/cron/notify-reconcile.js) catches up. The frontend ignores the response.
import { LIMITS, readNotifyConfig } from "./_lib/notify/config.js";
import { createMemoryRateLimiter, getClientIp, isAllowedOrigin, reply } from "./_lib/notify/http.js";
import { createSupabaseRpc } from "./_lib/notify/supabase.js";
import { processOutbox } from "./_lib/notify/worker.js";

export const createNotifyKickHandler = ({
  env = process.env,
  limiter = createMemoryRateLimiter(),
  makeRpc = createSupabaseRpc,
  send,
  now = () => Date.now(),
} = {}) =>
  async function handler(request, response) {
    if (request.method !== "POST") {
      return reply(response, 405, { ok: false, error: "method_not_allowed" }, { Allow: "POST" });
    }
    if (Number(request.headers?.["content-length"] || 0) > LIMITS.kickBodyBytes) {
      return reply(response, 413, { ok: false, error: "payload_too_large" });
    }
    if (!isAllowedOrigin(request.headers?.origin, env)) {
      return reply(response, 403, { ok: false, error: "forbidden_origin" });
    }
    const { limit, windowSeconds } = LIMITS.kickPerIp;
    const windowIndex = Math.floor(now() / (windowSeconds * 1000));
    if (limiter.hit(`kick:${getClientIp(request.headers)}:${windowIndex}`, windowSeconds) > limit) {
      return reply(response, 429, { ok: false, error: "rate_limited" }, { "Retry-After": String(windowSeconds) });
    }

    const settings = readNotifyConfig(env);
    if (!settings.ok) {
      console.error("[notify-01a] not configured:", settings.problems.join(", "));
      return reply(response, 503, { ok: false, error: "unavailable" });
    }

    try {
      const rpc = makeRpc(settings.config);
      const summary = await processOutbox({
        rpc, config: settings.config, limit: LIMITS.kickBatch, budgetMs: LIMITS.kickBudgetMs, now,
        ...(send ? { send } : {}),
      });
      if (summary.claimed) console.info("[notify-01a] kick", JSON.stringify(summary));
    } catch (error) {
      // Never surfaced to the visitor: the request is saved; the cron retries.
      console.error("[notify-01a] kick failed:", error.code ?? error.name ?? "error");
    }

    // Same answer whatever happened: no oracle on the queue state.
    return reply(response, 202, { ok: true });
  };

export default createNotifyKickHandler();
