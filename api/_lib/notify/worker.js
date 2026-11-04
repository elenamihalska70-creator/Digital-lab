// LOT NOTIFY-01A — processes due outbox rows: claim → build → send (idempotent) → mark.
// Logs carry only ids, counters and short error codes: never names, e-mails, messages or secrets.
import { buildPayload, payloadSha256 } from "./render.js";
import { sendViaResend } from "./resend.js";

const log = (level, event, fields = {}) => console[level](`[notify-01a] ${event}`, JSON.stringify(fields));

export const processOutbox = async ({
  rpc,
  config,
  limit,
  budgetMs,
  send = (args) => sendViaResend(args),
  now = () => Date.now(),
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
