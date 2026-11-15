// DL-PRIVACY-CONSENT-01 — applies a consent choice to the optional vendors.
// GA4 and Clarity load only for a granted category, and still only where isTrackingAllowed()
// (production build on an allowed domain): localhost, Vercel Preview and the prerender never load them.
import { disableGoogleAnalytics, initializeGoogleAnalytics, trackPageView } from "./analytics.js";
import { initializeMicrosoftClarity, withdrawMicrosoftClarity } from "./clarity.js";
import { CONSENT_CHANGE_EVENT, readStoredConsent, storeConsent } from "./consent.js";

// `sendPageView`: when consent is given during a visit, the page being viewed at that moment is
// recorded once. Earlier pages and interactions are never replayed. At startup the App's route
// effect sends the page view itself, after the page metadata is applied.
export function applyTrackingConsent(consent, { sendPageView = false } = {}) {
  let reloadRequired = false;
  if (consent?.analytics === true) {
    if (initializeGoogleAnalytics() && sendPageView) trackPageView();
  } else {
    disableGoogleAnalytics();
  }
  if (consent?.recording === true) initializeMicrosoftClarity();
  else reloadRequired = withdrawMicrosoftClarity();
  return { reloadRequired };
}

// Startup: only a valid, current, unexpired stored choice can enable anything.
// Leftover GA/Clarity cookies from earlier visits are deleted when not consented.
export function startTrackingConsent() {
  const consent = readStoredConsent();
  applyTrackingConsent(consent);
  return consent;
}

// Saves a visitor decision and applies it immediately. Withdrawing Clarity after it ran on this page
// reloads the page (Clarity has no stop call); GA4 stops in place.
export function saveTrackingConsent(choice, { reload = () => window.location.reload() } = {}) {
  const consent = storeConsent(choice);
  const { reloadRequired } = applyTrackingConsent(consent, { sendPageView: true });
  if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent(CONSENT_CHANGE_EVENT, { detail: consent }));
  if (reloadRequired) reload();
  return { consent, reloadRequired };
}
