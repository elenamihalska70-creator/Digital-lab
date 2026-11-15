// LOT DL-GROWTH-TRACKING-01 — estimator usage events for GA4.
//
// Pure module (no React, no DOM): UnifiedEstimator feeds it user interactions and
// committed estimates, and `send` is the existing analytics trackEvent(), which stays
// a no-op unless the production-only GA4 guard initialized window.gtag.
//
// Event contract (see docs/DL-GROWTH-TRACKING-01.md):
// - estimator_open: first intentional interaction (trusted click or change on a control)
//   with one mounted estimator instance. Once per instance; never on render or visibility.
// - estimator_price_view: an intentional interaction produced a priced configuration
//   that differs from the one displayed just before AND was not already counted by this
//   instance. The configuration shown on render or applied by an external preset is
//   passive: it is never counted itself, so explicitly returning to it later counts once.
//   Removing a service (nothing new priced) is not a price view.
//
// Only enumerated, categorical values are sent: no amount, free text, URL, e-mail, name,
// instance id, visitor id or timestamp. GA4 aggregates users itself.

export const ESTIMATOR_EVENTS = Object.freeze({
  open: "estimator_open",
  priceView: "estimator_price_view",
});

export const ESTIMATOR_VARIANTS = Object.freeze(["main", "social"]);
export const ESTIMATOR_LANGUAGES = Object.freeze(["fr", "en"]);
export const SERVICE_CATEGORIES = Object.freeze([
  "website", "repair", "seo", "automation", "chatbot", "prototype", "social_media", "reels",
]);
export const BILLING_TYPES = Object.freeze(["fixed", "from", "quote", "monthly"]);
export const PRICE_VIEW_CURRENCY = "EUR";

// Same identifiers as the existing reelsAnalyticsKey in App.jsx (social_media_offer_select).
const REELS_PACKAGE_IDS = Object.freeze({ single: "reels_1", pack4: "reels_4", pack8: "reels_8", complex: "reels_complex" });
const REELS_BILLING = Object.freeze({ "one-time": "fixed", monthly: "monthly", quote: "quote" });
const WEBSITE_PAGE_IDS = Object.freeze({ 1: "website_1_page", 3: "website_3_pages", 5: "website_5_pages" });
const REPAIR_CATEGORY_IDS = Object.freeze(["small", "comprehensive", "technical", "urgent"]);
const PACKAGE_CATEGORIES = Object.freeze(["seo", "automation", "chatbot", "prototype"]);
const SAFE_ID = /^[a-z][a-z0-9_]{0,39}$/;

const item = (service_category, package_id, billing_type, priceKey) =>
  SERVICE_CATEGORIES.includes(service_category) && SAFE_ID.test(package_id) && BILLING_TYPES.includes(billing_type)
    ? { service_category, package_id, billing_type, key: `${service_category}:${package_id}:${billing_type}:${priceKey}` }
    : null;

// One entry per priced service of an estimate. `key` (local only, never sent) also holds the
// computed amounts, so a change that moves the price is a different configuration.
export function getPricedItems(estimate) {
  if (!estimate) return [];
  const items = [];
  const project = estimate.project;
  if (project?.kind === "package" && PACKAGE_CATEGORIES.includes(project.category)) {
    items.push(item(project.category, `${project.category}_${project.packageId}`, project.billing, project.price ?? "quote"));
  } else if (project?.kind === "repair" && REPAIR_CATEGORY_IDS.includes(project.category)) {
    items.push(item("repair", `repair_${project.category}`, project.billing, project.price ?? "quote"));
  } else if (project?.kind === "one-off" && WEBSITE_PAGE_IDS[project.pages]) {
    items.push(item("website", WEBSITE_PAGE_IDS[project.pages], "from", project.budget));
  }
  const social = estimate.social;
  if (social) {
    const setup = estimate.oneTimeFees?.find((fee) => fee.key === "setupAudit")?.amount ?? 0;
    items.push(item("social_media", `social_${social.plan}`, "monthly",
      [social.launchMonthly, social.referenceMonthly, social.launchMonths, setup].join("/")));
  }
  const reels = estimate.reels;
  if (reels && REELS_PACKAGE_IDS[reels.key]) {
    items.push(item("reels", REELS_PACKAGE_IDS[reels.key], REELS_BILLING[reels.billing], reels.price ?? "quote"));
  }
  return items.filter(Boolean);
}

export function createEstimatorTracker({ variant, language, send }) {
  const base = {
    estimator_variant: ESTIMATOR_VARIANTS.includes(variant) ? variant : "main",
    page_language: ESTIMATOR_LANGUAGES.includes(language) ? language : "fr",
  };
  let opened = false;
  let pending = false;
  let displayed = null;
  const counted = new Set();

  return {
    // A trusted click/change on a control inside this estimator.
    noteInteraction() {
      if (!opened) {
        opened = true;
        send(ESTIMATOR_EVENTS.open, { ...base });
      }
      pending = true;
    },
    // Called after every committed render. `interactive: false` marks a render caused by an
    // external preset: its configuration becomes the displayed one without being counted.
    commit(estimate, { interactive = true } = {}) {
      const items = getPricedItems(estimate);
      const previous = displayed;
      const wasPending = pending;
      displayed = items;
      pending = false;
      if (!wasPending || !interactive || !previous) return null;
      const previousKeys = new Set(previous.map((entry) => entry.key));
      const added = items.find((entry) => !previousKeys.has(entry.key));
      const configuration = items.map((entry) => entry.key).join("|");
      if (!added || counted.has(configuration)) return null;
      counted.add(configuration);
      const parameters = {
        ...base,
        service_category: added.service_category,
        package_id: added.package_id,
        billing_type: added.billing_type,
        currency: PRICE_VIEW_CURRENCY,
      };
      send(ESTIMATOR_EVENTS.priceView, parameters);
      return parameters;
    },
  };
}

// Interactive controls whose trusted click/change counts as intentional estimator use.
export const ESTIMATOR_INTERACTIVE_SELECTOR = "button, input, select, textarea, summary, a[href]";
