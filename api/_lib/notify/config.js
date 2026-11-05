/* global process */
// LOT NOTIFY-01A — server configuration. Files under api/_lib are not exposed as Vercel functions.

// Fixed recipients. Hard-coded on purpose: no environment variable, no request field can change them.
export const NOTIFY_RECIPIENTS = Object.freeze(["contact@digitallab.studio", "elenamihalska70@gmail.com"]);

// The sender must be on the verified Resend domain (the resend.dev test sender only delivers to the
// Resend account owner, so it would silently drop one recipient).
export const SENDER_DOMAIN = "digitallab.studio";

export const RESEND_API_URL = "https://api.resend.com/emails";

export const LIMITS = Object.freeze({
  // Worker
  kickBatch: 3, // rows per visitor-triggered call
  cronBatch: 5, // rows per cron round
  cronRounds: 4, // at most 20 per cron run (= hourly cap)
  kickBudgetMs: 20_000,
  cronBudgetMs: 45_000,
  resendTimeoutMs: 8_000,
  inlineRetryDelayMs: 1_000, // one extra attempt in the same call after a temporary Resend error
  // E-mail content
  messageChars: 8_000,
  subjectChars: 180,
  // Visitor-triggered endpoint
  kickBodyBytes: 20_000,
  kickPerIp: { limit: 10, windowSeconds: 600 },
  cronSecretMinLength: 16,
});

const EMAIL_PATTERN = /^[^\s@<>()[\]\\,;:"]+@[^\s@<>()[\]\\,;:"]+\.[^\s@<>()[\]\\,;:"]{2,}$/;
export const isValidEmail = (value) => typeof value === "string" && value.length <= 254 && EMAIL_PATTERN.test(value);

const isDeployed = (env) => env.VERCEL_ENV === "production" || env.VERCEL_ENV === "preview";
const isLoopbackHttp = (value) => /^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?(\/|$)/i.test(value);

/** "Digital Lab <notifications@digitallab.studio>" or a bare address, on the verified domain only. */
export const parseSender = (value) => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  const match = trimmed.match(/^([^<>"\r\n]{1,64}?)\s*<([^<>\s]+)>$/) ?? trimmed.match(/^()([^<>\s]+)$/);
  if (!match) return null;
  const address = match[2].toLowerCase();
  if (!isValidEmail(address) || !address.endsWith(`@${SENDER_DOMAIN}`)) return null;
  const name = match[1].trim();
  return name ? `${name} <${address}>` : address;
};

/**
 * Reads and validates the configuration. Never returns secret values in `problems`.
 * { ok: true, config } or { ok: false, problems: [names of missing / invalid variables] }.
 */
export const readNotifyConfig = (env = process.env) => {
  // Preview deployments (any branch) must never use the Production database or send e-mails, even
  // if a secret happens to be exposed to the Preview environment by mistake: refused outright.
  if (env.VERCEL_ENV === "preview") return { ok: false, problems: ["VERCEL_ENV=preview"] };

  const problems = [];

  const supabaseUrl = String(env.SUPABASE_URL || env.VITE_SUPABASE_URL || "").trim().replace(/\/$/, "");
  const urlOk = /^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(supabaseUrl) || (!isDeployed(env) && isLoopbackHttp(supabaseUrl));
  if (!urlOk) problems.push("SUPABASE_URL");

  const serviceKey = String(env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SECRET_KEY || "").trim();
  if (!serviceKey || serviceKey === String(env.VITE_SUPABASE_ANON_KEY || "").trim()) problems.push("SUPABASE_SERVICE_ROLE_KEY");

  const resendApiKey = String(env.RESEND_API_KEY || "").trim();
  if (!resendApiKey) problems.push("RESEND_API_KEY");

  const from = parseSender(env.RESEND_FROM_EMAIL);
  if (!from) problems.push("RESEND_FROM_EMAIL");

  // Test hook for the local end-to-end run (fake Resend). Ignored on Vercel deployments and for
  // anything but a loopback http URL.
  const override = String(env.NOTIFY_RESEND_API_URL || "").trim();
  const resendUrl = override && !isDeployed(env) && isLoopbackHttp(override) ? override : RESEND_API_URL;

  if (problems.length) return { ok: false, problems };
  return { ok: true, config: { supabaseUrl, serviceKey, resendApiKey, from, resendUrl, to: [...NOTIFY_RECIPIENTS] } };
};
