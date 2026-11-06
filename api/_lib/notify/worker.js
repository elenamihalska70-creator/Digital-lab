// LOT NOTIFY-01A — processes due outbox rows: claim → build → send (idempotent) → mark.
// Logs carry only ids, counters and short error codes: never names, e-mails, messages or secrets.
import { LIMITS } from "./config.js";
import { buildPayload, payloadSha256 } from "./render.js";
import { sendViaResend } from "./resend.js";

const log = (level, event, fields = {}) => console[level](`[notify-01a] ${event}`, JSON.stringify(fields));

// Temporary Resend errors worth one more attempt a second later. Not 401 / 403 (configuration) nor
// a 429 quota (daily / monthly): retrying within a second cannot fix them.
const TRANSIENT = /^(timeout|network|idempotency_concurrent|http_5\d\d(:\w+)?|http_429(:rate_limit_exceeded)?)$/;
export const isTransient = (outcome) => outcome?.result === "retry" && TRANSIENT.test(outcome.error ?? "");

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export const processOutbox = async ({
  rpc,
  config,
  limit,
  budgetMs,
  send = (args) => sendViaResend(args),
  now = () => Date.now(),
  sleep = wait,
  retryDelayMs = LIMITS.inlineRetryDelayMs,
  attemptMs = LIMITS.resendTimeoutMs,
}) => {
  const started = now();
  const summary = { claimed: 0, sent: 0, retry: 0, dead: 0, stale: 0, skipped: 0, mark_errors: 0 };
  const rows = await rpc.claim(limit);
  summary.claimed = rows.length;

  for (const row of rows) {
    if (now() - started > budgetMs) {
      // Left leased: the lease expires (2 min) and the row is handed out again with the same key.
      summary.skipped += 1;
      continue;
    }

    const payload = buildPayload(row, { from: config.from, to: config.to });
    const sha = payloadSha256(payload);
    let outcome;
    if (row.kind === "new_request" && !row.request_id) {
      outcome = { result: "dead", error: "request_missing" };
    } else if (row.payload_sha256 && row.payload_sha256 !== sha) {
      // The content would differ from the first attempt (configuration changed): Resend would answer
      // 409 or, after 24 h, send a second e-mail. Stop and let an operator decide.
      outcome = { result: "dead", error: "payload_changed" };
    } else {
      outcome = await send({ payload, idempotencyKey: row.idempotency_key, config });
      // One extra attempt in the same call: same key and same payload, so Resend can never send twice
      // (original response, or 409 while the first request is still processed). Only when it is
      // sure to end within the time budget, which keeps the call under the Vercel maxDuration.
      if (isTransient(outcome) && now() - started + retryDelayMs + attemptMs <= budgetMs) {
        log("warn", "inline retry", { outbox_id: row.outbox_id, error: outcome.error });
        await sleep(retryDelayMs);
        outcome = await send({ payload, idempotencyKey: row.idempotency_key, config });
      }
    }

    try {
      const status = await rpc.mark(row, outcome, sha);
      if (status === "stale") summary.stale += 1;
      else summary[outcome.result] += 1;
      log(outcome.result === "sent" ? "info" : "warn", "attempt", {
        outbox_id: row.outbox_id, kind: row.kind, attempt: row.attempts, result: outcome.result,
        status, error: outcome.error ?? null, resend_id: outcome.id ?? null,
      });
    } catch (error) {
      // The lease will expire and the same idempotency key will be used again: no duplicate.
      summary.mark_errors += 1;
      log("error", "mark failed", { outbox_id: row.outbox_id, result: outcome.result, code: error.code ?? "error" });
    }
  }

  return summary;
};
