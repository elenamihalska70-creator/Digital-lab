import { WEBSITE_NEED, WEBSITE_PRICING } from "./websitePricing.js";

// Features already part of every website package: shown as included, never as options.
export const WEBSITE_INCLUDED_FEATURES = WEBSITE_PRICING.includedFeatures;

export const isFeatureSelectable = (need, feature) =>
  need !== WEBSITE_NEED || !WEBSITE_INCLUDED_FEATURES.includes(feature);

// DL-PRICING-V3-06: for websites the page package (1/3/5) is the basic offer, so
// the manual complexity selector is hidden and its (possibly stale) value never
// reaches the pricing engine. Advanced work is only charged through explicitly
// selected features. Other project types keep the visitor's own selection.
const WEBSITE_COMPLEXITY_BY_SCOPE = {
  single: "Simple : page ou fonctionnalité basique",
  multi: "Standard : plusieurs pages ou plusieurs fonctions",
};

export const getWebsiteComplexity = (pages) =>
  Number(pages) > 1 ? WEBSITE_COMPLEXITY_BY_SCOPE.multi : WEBSITE_COMPLEXITY_BY_SCOPE.single;

export function getEffectiveProjectAnswers(answers, need) {
  const project = { ...answers, need };
  if (need !== WEBSITE_NEED) return project;
  // Included features ticked for another project type stay stored but are not website options.
  return {
    ...project,
    complexity: getWebsiteComplexity(project.pages),
    features: (project.features ?? []).filter((feature) => isFeatureSelectable(need, feature)),
  };
}
