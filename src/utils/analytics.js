const GA_MEASUREMENT_ID = "G-DPEYZ4C8BD";
const GTAG_SCRIPT_ID = "google-analytics-gtag";

const getPagePath = () => `${window.location.pathname}${window.location.search}${window.location.hash}`;

export const initializeGoogleAnalytics = () => {
  if (typeof window === "undefined") {
    return;
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
    return;
  }

  window.gtag("js", new Date());
  window.gtag("config", GA_MEASUREMENT_ID, { send_page_view: false });
  window.__digitalLabGaInitialized = true;
};

export const trackPageView = () => {
  if (typeof window === "undefined" || typeof window.gtag !== "function") {
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
