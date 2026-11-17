import { isTrackingAllowed } from "./trackingEnvironment.js";
import { deleteCookies } from "./consent.js";

export const GA_MEASUREMENT_ID = "G-DPEYZ4C8BD";
const GTAG_SCRIPT_ID = "google-analytics-gtag";
const GA_DISABLE_FLAG = `ga-disable-${GA_MEASUREMENT_ID}`;
export const GA_COOKIES = ["_ga", "_ga_*", "_gid", "_gat*"];

// DL-PRIVACY-CONSENT-01: GA4 is loaded only after the visitor opted into audience measurement
// (see utils/trackingConsent.js), and only in production on an allowed domain. Until then
// window.gtag stays undefined; trackPageView and trackEvent are no-ops unless GA4 is enabled.
let analyticsEnabled = false;

const getPagePath = () => `${window.location.pathname}${window.location.search}${window.location.hash}`;

// Supabase sign-in, password-reset and confirmation links return with credentials in the query or
// fragment (implicit flow: #access_token=…&refresh_token=…; PKCE: ?code=…; e-mail links: token_hash;
// failed callbacks: error_code/error_description). Nothing is sent to GA4 while the address carries one.
const CREDENTIAL_PARAMETER =
  /(?:^|[?#&])(?:access_token|refresh_token|provider_token|provider_refresh_token|id_token|token_hash|token|code|error_code|error_description)=/i;
export const urlContainsCredentials = (href = "") => {
  const queryStart = String(href).search(/[?#]/);
  return queryStart !== -1 && CREDENTIAL_PARAMETER.test(String(href).slice(queryStart));
};

// Address guard for a GA4 instance that is already running. Besides our own helpers, gtag.js can send
// hits by itself (for example page views on history changes, if enabled in the GA4 property). Google's
// official opt-out flag is therefore raised whenever the address carries credentials, before the
// history change happens, and lifted again once the address is clean and consent still holds.
const syncAddressGuard = (href) => {
  if (typeof window === "undefined" || !window.__digitalLabGaInitialized) return;
  window[GA_DISABLE_FLAG] = !analyticsEnabled || urlContainsCredentials(href ?? window.location.href);
};
let addressGuardInstalled = false;
const installAddressGuard = () => {
  if (addressGuardInstalled) return;
  addressGuardInstalled = true;
  for (const method of ["pushState", "replaceState"]) {
    const original = window.history[method];
    window.history[method] = function guardedHistoryChange(state, title, url) {
      if (url !== undefined && url !== null) {
        try {
          syncAddressGuard(new URL(String(url), window.location.href).href);
        } catch {
          // Invalid URL: the browser rejects the call below.
        }
      }
      const result = original.apply(this, arguments);
      syncAddressGuard();
      return result;
    };
  }
  window.addEventListener("popstate", () => syncAddressGuard());
  window.addEventListener("hashchange", () => syncAddressGuard());
};

export const isGoogleAnalyticsEnabled = () => analyticsEnabled;

// Returns true when GA4 is active on this page after the call.
export const initializeGoogleAnalytics = () => {
  if (
    typeof window === "undefined" ||
    !isTrackingAllowed({ hostname: window.location.hostname, isProductionBuild: import.meta.env.PROD })
  ) {
    return false;
  }

  window.dataLayer = window.dataLayer || [];
  window.gtag =
    window.gtag ||
    function gtag() {
      window.dataLayer.push(arguments);
    };

  if (!document.getElementById(GTAG_SCRIPT_ID)) {
    const script = document.createElement("script");
    script.id = GTAG_SCRIPT_ID;
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;
    document.head.appendChild(script);
  }

  if (window.__digitalLabGaInitialized) {
    window.gtag("consent", "update", { analytics_storage: "granted" });
  } else {
    // Only audience measurement was accepted: advertising storage and signals stay denied.
    window.gtag("consent", "default", {
      analytics_storage: "granted",
      ad_storage: "denied",
      ad_user_data: "denied",
      ad_personalization: "denied",
    });
    window.gtag("js", new Date());
    window.gtag("config", GA_MEASUREMENT_ID, {
      send_page_view: false,
      allow_google_signals: false,
      allow_ad_personalization_signals: false,
    });
    window.__digitalLabGaInitialized = true;
  }
  analyticsEnabled = true;
  // Re-consent after a withdrawal on the same page lifts Google's opt-out flag, unless the address
  // carries credentials; from now on the flag follows the address.
  installAddressGuard();
  syncAddressGuard();
  return true;
};

// Withdrawal or refusal: nothing more is sent from this page (Google's opt-out flag stops gtag.js,
// and our helpers stop queueing), and first-party GA cookies are deleted. No reload is needed.
export const disableGoogleAnalytics = () => {
  if (typeof window === "undefined") return;
  analyticsEnabled = false;
  window.__digitalLabLastTrackedPagePath = undefined;
  // Only signal a GA4 instance this site initialized after consent; never call gtag otherwise.
  if (window.__digitalLabGaInitialized && typeof window.gtag === "function") {
    window[GA_DISABLE_FLAG] = true;
    window.gtag("consent", "update", { analytics_storage: "denied" });
  }
  deleteCookies(GA_COOKIES);
};

export const trackPageView = () => {
  if (!analyticsEnabled || typeof window === "undefined" || typeof window.gtag !== "function") {
    return;
  }
  if (urlContainsCredentials(window.location.href)) return;

  const pagePath = getPagePath();

  if (window.__digitalLabLastTrackedPagePath === pagePath) {
    return;
  }

  window.__digitalLabLastTrackedPagePath = pagePath;
  window.gtag("event", "page_view", {
    page_title: document.title,
    page_location: window.location.href,
    page_path: pagePath,
  });
};

export const trackEvent = (eventName, parameters = {}) => {
  if (!analyticsEnabled || typeof window === "undefined" || typeof window.gtag !== "function") {
    return;
  }
  if (urlContainsCredentials(window.location.href)) return;

  window.gtag("event", eventName, parameters);
};
