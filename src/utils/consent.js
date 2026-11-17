// DL-PRIVACY-CONSENT-01 — visitor consent for optional tracking (see docs/DL-PRIVACY-CONSENT-01.md).
//
// Two optional categories, both off unless the visitor explicitly opts in:
// - analytics: Google Analytics 4 (audience measurement)
// - recording: Microsoft Clarity (session recording / heatmaps)
// Strictly necessary storage (this choice itself, the client-area session) needs no consent.
//
// Stored record (localStorage, first party, never sent anywhere):
//   { "version": CONSENT_POLICY_VERSION, "analytics": boolean, "recording": boolean, "date": "YYYY-MM-DD" }
// The date (day precision) only lets the choice expire after CONSENT_MAX_AGE_MONTHS, so a refusal
// is not asked again sooner and a consent is renewed. No identifier, no timestamp precision.
// Absent, malformed, outdated (other version) or expired records count as "no choice": nothing optional loads.
import { TRACKING_HOSTNAMES } from "./trackingEnvironment.js";

export const CONSENT_STORAGE_KEY = "dl-consent";
// Bump when the vendors, purposes or this record change: every visitor is asked again.
export const CONSENT_POLICY_VERSION = 1;
export const CONSENT_MAX_AGE_MONTHS = 6;
export const CONSENT_CATEGORIES = Object.freeze(["analytics", "recording"]);
export const CONSENT_OPEN_EVENT = "dl:consent-open";
export const CONSENT_CHANGE_EVENT = "dl:consent-change";

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const isoDay = (now) => now.toISOString().slice(0, 10);

export function parseConsent(raw, now = new Date()) {
  if (typeof raw !== "string" || raw.length > 200) return null;
  let value;
  try {
    value = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  if (value.version !== CONSENT_POLICY_VERSION) return null;
  if (typeof value.analytics !== "boolean" || typeof value.recording !== "boolean") return null;
  if (typeof value.date !== "string" || !DATE.test(value.date)) return null;
  const decided = new Date(`${value.date}T00:00:00Z`);
  if (Number.isNaN(decided.getTime()) || decided.getTime() > now.getTime() + 86400000) return null;
  const expiry = new Date(decided);
  expiry.setUTCMonth(expiry.getUTCMonth() + CONSENT_MAX_AGE_MONTHS);
  if (now.getTime() >= expiry.getTime()) return null;
  return { analytics: value.analytics, recording: value.recording, date: value.date };
}

export const serializeConsent = ({ analytics, recording }, now = new Date()) =>
  JSON.stringify({ version: CONSENT_POLICY_VERSION, analytics: analytics === true, recording: recording === true, date: isoDay(now) });

const storage = () => {
  try {
    return typeof window !== "undefined" ? window.localStorage : null;
  } catch {
    return null;
  }
};

export function readStoredConsent(now = new Date()) {
  try {
    const raw = storage()?.getItem(CONSENT_STORAGE_KEY);
    const consent = parseConsent(raw, now);
    // Drop records that no longer count, so they cannot be mistaken for a choice later.
    if (raw != null && !consent) storage()?.removeItem(CONSENT_STORAGE_KEY);
    return consent;
  } catch {
    return null;
  }
}

// Returns the normalized choice. If storage is unavailable the choice still applies to this page view.
export function storeConsent(choice, now = new Date()) {
  const serialized = serializeConsent(choice, now);
  try {
    storage()?.setItem(CONSENT_STORAGE_KEY, serialized);
  } catch {
    /* Private mode or blocked storage: the choice is not remembered. */
  }
  return parseConsent(serialized, now);
}

// The banner and the footer control appear where tracking can run (production domains) and on
// Vercel Previews, for review only: isTrackingAllowed() still blocks every vendor on Previews.
// Never on localhost or during the build-time prerender.
export const isConsentUiEnabled = ({ hostname = "", isProductionBuild }) => {
  const host = String(hostname).toLowerCase();
  return Boolean(isProductionBuild) && (TRACKING_HOSTNAMES.includes(host) || host.endsWith(".vercel.app"));
};

export const isCurrentConsentUiEnabled = () =>
  typeof window !== "undefined" && isConsentUiEnabled({ hostname: window.location.hostname, isProductionBuild: import.meta.env?.PROD });

export const openConsentPreferences = () => {
  if (typeof window !== "undefined") window.dispatchEvent(new Event(CONSENT_OPEN_EVENT));
};

// Expires first-party cookies by exact name or prefix, on the host and every parent domain
// (GA4 uses cookie_domain "auto", i.e. the registrable domain).
export function deleteCookies(matchers, { documentRef = typeof document !== "undefined" ? document : null, hostname } = {}) {
  if (!documentRef) return [];
  const host = String(hostname ?? documentRef.location?.hostname ?? "");
  const names = String(documentRef.cookie || "")
    .split(";")
    .map((part) => part.split("=")[0].trim())
    .filter((name) => name && matchers.some((matcher) => (matcher.endsWith("*") ? name.startsWith(matcher.slice(0, -1)) : name === matcher)));
  const labels = host.split(".");
  const domains = [""];
  for (let index = 0; index < labels.length - 1; index += 1) {
    const domain = labels.slice(index).join(".");
    domains.push(`; domain=${domain}`, `; domain=.${domain}`);
  }
  for (const name of new Set(names)) {
    for (const domain of domains) documentRef.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; max-age=0; path=/${domain}`;
  }
  return [...new Set(names)];
}
