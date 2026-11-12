import assert from "node:assert/strict";
import test from "node:test";
import { createHash } from "node:crypto";
import * as pricing from "./estimator.js";
// Golden digests captured before modification from production b083723 (V3-03).
// Covers 69,255 non-website cases: every feature subset plus repeated paid features.
function compatibilityDigest(pricing, socialOnly = false) {
  const hash = createHash('sha256');
  const add = value => hash.update(JSON.stringify(value) + '\n');
  if (!socialOnly) {
    const needs = ['Réparer / améliorer un site existant','Optimiser SEO & visibilité','Ajouter une automatisation','Créer un chatbot / assistant IA','Créer un MVP ou prototype web'];
    const complexities = ['Simple : page ou fonctionnalité basique','Standard : plusieurs pages ou plusieurs fonctions','Avancé : espace utilisateur, tableau de bord, automatisation ou IA'];
    const contents = ['Textes et images prêts','Quelques éléments seulement','Je pars de zéro'];
    const features = Object.keys(pricing.ESTIMATOR_FEATURE_ADJUSTMENTS);
    for (const need of needs) for (const complexity of complexities) for (const content of contents) for (const urgency of ['Normal','Rapide','Urgent']) {
      for (let mask = 0; mask <= 2 ** features.length; mask += 1) {
        const selected = mask === 2 ** features.length ? ['Paiement','Paiement','SEO'] : features.filter((_, bit) => mask & (1 << bit));
        const answers = {need,complexity,content,urgency,features:selected,pages:5,profile:'Indépendant',priority:'Être visible',existing:'Non'};
        add([pricing.getProjectEstimate(answers),pricing.getEstimatorResult(answers)]);
      }
    }
  } else {
    add([pricing.SOCIAL_MEDIA_PLANS,pricing.SOCIAL_MEDIA_ADDONS,pricing.REELS_PACKS,pricing.REELS_OFFERS,pricing.SOCIAL_MEDIA_LAUNCH_ACTIVE,pricing.SOCIAL_MEDIA_LAUNCH_MONTHS,pricing.SOCIAL_MEDIA_LAUNCH_CLIENT_LIMIT]);
    for (let n=0;n<=24;n+=1) add(pricing.getReelsPrice(n));
    for (const plan of ['presence','visibilite','croissance']) for (const launchActive of [false,true]) for (let platforms=0;platforms<=4;platforms+=1) for (const extraPosts of [0,4,8]) for (const extraReels of [0,1,2,4,8]) for (const setupAudit of [false,true]) {
      add(pricing.getSocialMediaEstimate({plan,launchActive,platforms,extraPosts,reels:extraReels,setupAudit}));
      add(pricing.getUnifiedEstimate({contentService:'social',launchActive,social:{plan,networks:pricing.SOCIAL_MEDIA_NETWORKS.slice(0,platforms),extraPosts,extraReels,setupAudit}}));
    }
    for (const reels of ['single','pack4','pack8','complex']) add(pricing.getUnifiedEstimate({contentService:'reels',reels}));
  }
  return hash.digest('hex');
}
test("Other one-off services preserve production budgets, rounding, delays and levels", () => {
  assert.equal(compatibilityDigest(pricing), "f51f8bf4175deabf62bf2d30d94922ee06466c94c4662e7aab1d9611989dbdb4");
});
test("Social Media and Reels preserve production prices, options and unified outputs", () => {
  assert.equal(compatibilityDigest(pricing, true), "4c60366812040decce0cbdf9e067861bc7815be9eed83f07cee85cd9cadeb5f1");
});
