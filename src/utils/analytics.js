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

export const isGoogleAnalyticsEnabled = () => analyticsEnabled;

// Returns true when GA4 is active on this page after the call.
export const initializeGoogleAnalytics = () => {
  if (
    typeof window === "undefined" ||
    !isTrackingAllowed({ hostname: window.location.hostname, isProductionBuild: import.meta.env.PROD })
  ) {
    return false;
  }

  // Re-consent after a withdrawal on the same page: lift Google's official opt-out flag.
  window[GA_DISABLE_FLAG] = false;

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

  window.gtag("event", eventName, parameters);
};
