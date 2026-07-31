const CLARITY_PROJECT_ID = "xv376wrguc";
const CLARITY_SCRIPT_ID = "microsoft-clarity-script";

export const initializeMicrosoftClarity = () => {
  if (typeof window === "undefined" || !import.meta.env.PROD) {
    return;
  }

  if (window.__digitalLabClarityInitialized || document.getElementById(CLARITY_SCRIPT_ID)) {
    return;
  }

  window.__digitalLabClarityInitialized = true;

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
};
