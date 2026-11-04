// LOT NOTIFY-01A — one Resend call and the classification of its outcome.
//
// Resend idempotency (https://resend.com/docs/dashboard/emails/idempotency-keys, checked 2026-11-04):
//   * keys kept 24 h, up to 256 characters;
//   * same key + same payload → the original response, the e-mail is NOT sent again;
//   * same key + different payload → 409 invalid_idempotent_request (retrying cannot help);
//   * same key while the first request is still processed → 409 concurrent_idempotent_requests (retry later).
//   * timeout: not documented. A retry with the same key and payload inside 24 h either returns the
//     original response (it was processed) or sends once (it was not): safe both ways.
import { LIMITS } from "./config.js";

const errorName = (data) => (typeof data?.name === "string" ? data.name.replace(/[^a-z0-9_]/gi, "").slice(0, 40) : "");

/**
 * Returns { result: "sent", id } | { result: "retry", error } | { result: "dead", error }.
 * `error` is a short code, never message content or a secret.
 */
export const sendViaResend = async ({ payload, idempotencyKey, config, fetchImpl = fetch, timeoutMs = LIMITS.resendTimeoutMs }) => {
  let response;
  try {
    response = await fetchImpl(config.resendUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.resendApiKey}`,
        "Content-Type": "application/json",
        "Idempotency-Key": idempotencyKey,
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (error) {
    return { result: "retry", error: error?.name === "TimeoutError" || error?.name === "AbortError" ? "timeout" : "network" };
  }

  const data = await response.json().catch(() => ({}));
  const status = response.status;

  if (response.ok) {
    return { result: "sent", id: typeof data?.id === "string" ? data.id.slice(0, 128) : null };
  }
  if (status === 409) {
    const name = errorName(data);
    if (name === "invalid_idempotent_request") return { result: "dead", error: "idempotency_payload_mismatch" };
    return { result: "retry", error: name === "concurrent_idempotent_requests" ? "idempotency_concurrent" : "http_409" };
  }
  // 429: rate / quota. 5xx: Resend side. 401 / 403: key or domain configuration, fixable by the
  // owner: retried inside the idempotency window instead of being dropped.
  if (status === 429 || status >= 500 || status === 401 || status === 403) {
    return { result: "retry", error: `http_${status}${errorName(data) ? `:${errorName(data)}` : ""}` };
  }
  return { result: "dead", error: `http_${status}${errorName(data) ? `:${errorName(data)}` : ""}` };
};
