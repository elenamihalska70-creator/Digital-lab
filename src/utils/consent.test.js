import assert from "node:assert/strict";
import test from "node:test";
import {
  CONSENT_MAX_AGE_MONTHS, CONSENT_POLICY_VERSION, deleteCookies, isConsentUiEnabled, parseConsent, serializeConsent,
} from "./consent.js";
import { applyTrackingConsent } from "./trackingConsent.js";
import { trackEvent, trackPageView, isGoogleAnalyticsEnabled, urlContainsCredentials } from "./analytics.js";
import { CLARITY_ENABLED, initializeMicrosoftClarity } from "./clarity.js";

const NOW = new Date("2026-11-15T12:00:00Z");
const record = (overrides = {}) => JSON.stringify({ version: CONSENT_POLICY_VERSION, analytics: true, recording: false, date: "2026-11-15", ...overrides });

test("A valid, current record is the only thing that counts as a choice", () => {
  assert.deepEqual(parseConsent(record(), NOW), { analytics: true, recording: false, date: "2026-11-15" });
  assert.deepEqual(parseConsent(record({ analytics: false, recording: true }), NOW), { analytics: false, recording: true, date: "2026-11-15" });
});

test("Absent, malformed, outdated, partial or tampered records count as no consent", () => {
  for (const raw of [
    null, undefined, "", "null", "true", "[]", "{", "{}", "x".repeat(500),
    record({ version: CONSENT_POLICY_VERSION - 1 }), record({ version: CONSENT_POLICY_VERSION + 1 }), record({ version: "1" }),
    record({ analytics: "true" }), record({ recording: 1 }), record({ analytics: undefined }),
    record({ date: undefined }), record({ date: "15/11/2026" }), record({ date: "2026-13-45" }), record({ date: "2027-01-01" }),
  ]) {
    assert.equal(parseConsent(raw, NOW), null, String(raw).slice(0, 60));
  }
});

test(`A choice expires after ${CONSENT_MAX_AGE_MONTHS} months and must be asked again`, () => {
  assert.notEqual(parseConsent(record({ date: "2026-05-16" }), NOW), null);
  assert.equal(parseConsent(record({ date: "2026-05-15" }), NOW), null);
  assert.equal(parseConsent(record({ date: "2025-11-15" }), NOW), null);
});

test("The stored record is minimal: version, two booleans and a day, never an identifier", () => {
  const serialized = serializeConsent({ analytics: "yes", recording: true, extra: "user@example.com" }, NOW);
  assert.deepEqual(JSON.parse(serialized), { version: CONSENT_POLICY_VERSION, analytics: false, recording: true, date: "2026-11-15" });
  assert.ok(serialized.length < 100);
});

test("The consent UI appears on production domains and Vercel Previews only, never locally or in development", () => {
  for (const hostname of ["digitallab.studio", "www.digitallab.studio", "digital-abc-elenamihalska70-creators-projects.vercel.app"]) {
    assert.equal(isConsentUiEnabled({ hostname, isProductionBuild: true }), true, hostname);
  }
  for (const hostname of ["localhost", "127.0.0.1", "192.168.1.20", "notdigitallab.studio", "digitallab.studio.evil.com", ""]) {
    assert.equal(isConsentUiEnabled({ hostname, isProductionBuild: true }), false, hostname);
  }
  assert.equal(isConsentUiEnabled({ hostname: "www.digitallab.studio", isProductionBuild: false }), false);
});

test("Withdrawal deletes matching first-party cookies on the host and every parent domain only", () => {
  const writes = [];
  const fakeDocument = {
    location: { hostname: "www.digitallab.studio" },
    get cookie() { return "_ga=GA1.1.1; _ga_DPEYZ4C8BD=GS1; _gid=x; _clck=a; _clsk=b; other=keep; dl-consent=nope"; },
    set cookie(value) { writes.push(value); },
  };
  assert.deepEqual(deleteCookies(["_ga", "_ga_*", "_gid"], { documentRef: fakeDocument }), ["_ga", "_ga_DPEYZ4C8BD", "_gid"]);
  assert.ok(writes.every((write) => /^(_ga|_ga_DPEYZ4C8BD|_gid)=; expires=Thu, 01 Jan 1970/.test(write)));
  for (const domain of ["", "; domain=www.digitallab.studio", "; domain=.digitallab.studio", "; domain=digitallab.studio"]) {
    assert.ok(writes.includes(`_ga=; expires=Thu, 01 Jan 1970 00:00:00 GMT; max-age=0; path=/${domain}`), domain);
  }
  assert.ok(!writes.some((write) => write.startsWith("other=") || write.startsWith("_clck") || write.includes("domain=studio")));
  writes.length = 0;
  assert.deepEqual(deleteCookies(["_clck", "_clsk"], { documentRef: fakeDocument }), ["_clck", "_clsk"]);
  assert.equal(deleteCookies(["_ga"], { documentRef: null }).length, 0);
});

test("Outside a browser nothing loads, and tracking helpers stay no-ops without consent", () => {
  assert.deepEqual(applyTrackingConsent({ analytics: true, recording: true }), { reloadRequired: false });
  assert.deepEqual(applyTrackingConsent(null), { reloadRequired: false });
  assert.equal(isGoogleAnalyticsEnabled(), false);
  assert.doesNotThrow(() => { trackPageView(); trackEvent("estimator_quote_request", { offer: "x" }); });
});

test("Sign-in credentials in the address are detected, ordinary addresses are not", () => {
  for (const href of [
    "https://www.digitallab.studio/#access_token=eyJ.x.y&expires_in=3600&refresh_token=abc&token_type=bearer&type=recovery",
    "https://www.digitallab.studio/#refresh_token=abc", "https://www.digitallab.studio/?code=1234-abcd",
    "https://www.digitallab.studio/dashboard?token_hash=x&type=signup", "https://www.digitallab.studio/?a=1&provider_token=z",
    "https://www.digitallab.studio/#id_token=z", "https://www.digitallab.studio/?TOKEN=x",
    "https://www.digitallab.studio/#error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid",
  ]) assert.equal(urlContainsCredentials(href), true, href);
  for (const href of [
    "https://www.digitallab.studio/", "https://www.digitallab.studio/politique-de-confidentialite#cookies",
    "https://www.digitallab.studio/?utm_source=newsletter&utm_campaign=autumn", "https://www.digitallab.studio/barcode-reader",
    "https://www.digitallab.studio/access_token=page", "https://www.digitallab.studio/#services", "", undefined,
  ]) assert.equal(urlContainsCredentials(href), false, String(href));
});

test("Microsoft Clarity is disabled for this release: it never loads, even with a stored opt-in", () => {
  assert.equal(CLARITY_ENABLED, false);
  assert.equal(initializeMicrosoftClarity(), false);
  assert.deepEqual(applyTrackingConsent({ analytics: false, recording: true }), { reloadRequired: false });
});
