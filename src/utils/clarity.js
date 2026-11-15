import { isTrackingAllowed } from "./trackingEnvironment.js";
import { deleteCookies } from "./consent.js";

const CLARITY_PROJECT_ID = "xv376wrguc";
const CLARITY_SCRIPT_ID = "microsoft-clarity-script";
export const CLARITY_COOKIES = ["_clck", "_clsk"];

// DL-PRIVACY-CONSENT-01: Clarity is loaded only after the visitor opted into session recording
// (see utils/trackingConsent.js), and only in production on an allowed domain. Clarity must not
// be loaded without consent: with consent "denied" it still records in its "no-consent mode".
// Page content is masked in code: <body data-clarity-mask="true"> in index.html.

// Returns true when Clarity is active on this page after the call.
export const initializeMicrosoftClarity = () => {
  if (
    typeof window === "undefined" ||
    !isTrackingAllowed({ hostname: window.location.hostname, isProductionBuild: import.meta.env.PROD })
  ) {
    return false;
  }

  if (window.__digitalLabClarityInitialized || document.getElementById(CLARITY_SCRIPT_ID)) {
    return true;
  }

  window.__digitalLabClarityInitialized = true;
  document.body?.setAttribute("data-clarity-mask", "true");

  (function loadClarity(c, l, a, r, i, t, y) {
    c[a] =
      c[a] ||
      function clarityQueue() {
        (c[a].q = c[a].q || []).push(arguments);
      };
    t = l.createElement(r);
    t.id = CLARITY_SCRIPT_ID;
    t.async = 1;
    t.src = "https://www.clarity.ms/tag/" + i;
    y = l.getElementsByTagName(r)[0];
    y.parentNode.insertBefore(t, y);
  })(window, document, "clarity", "script", CLARITY_PROJECT_ID);

  // Consent API v2: session recording accepted, advertising storage never.
  window.clarity("consentv2", { ad_Storage: "denied", analytics_Storage: "granted" });
  return true;
};

export const isMicrosoftClarityLoaded = () => typeof window !== "undefined" && Boolean(window.__digitalLabClarityInitialized);

// Withdrawal or refusal. Clarity has no documented "stop" call: denying consent and calling
// consent(false) erases its cookies, but the loaded script would keep recording in no-consent
// mode. Returns true when Clarity ran on this page, so the caller reloads it without Clarity.
export const withdrawMicrosoftClarity = () => {
  if (typeof window === "undefined") return false;
  const loaded = isMicrosoftClarityLoaded();
  if (typeof window.clarity === "function") {
    window.clarity("consentv2", { ad_Storage: "denied", analytics_Storage: "denied" });
    window.clarity("consent", false);
  }
  deleteCookies(CLARITY_COOKIES);
  return loaded;
};
