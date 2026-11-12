import { getUnifiedEstimate } from "./estimator.js";

export const REPAIR_NEED = "Réparer / améliorer un site existant";
export const INITIAL_REPAIR_DIAGNOSTIC = Object.freeze({
  issue: "", intervention: "", platform: "", scope: "", urgency: "", url: "", description: "",
});
export const REPAIR_QUESTIONS = {
  issue: { fr: "Problème principal", en: "Main issue", options: [
    ["button", "Bouton ou formulaire défectueux", "Broken button or form"],
    ["display", "Problème d’affichage", "Display issue"],
    ["performance", "Lenteur / performance", "Performance / slow website"],
    ["outage", "Site inaccessible", "Inaccessible website"],
    ["other", "Autre / je ne sais pas", "Other / unsure"],
  ] },
  intervention: { fr: "Type d’intervention", en: "Type of intervention", options: [
    ["targeted", "Intervention ciblée", "Targeted intervention"],
    ["several", "Plusieurs améliorations", "Several improvements"],
    ["comprehensive", "Optimisation globale", "Comprehensive optimisation"],
    ["unsure", "Je ne sais pas", "Unsure"],
  ] },
  platform: { fr: "Plateforme du site", en: "Website platform", options: [
    ["wordpress", "WordPress / WooCommerce", "WordPress / WooCommerce"],
    ["hosted", "Shopify / Wix / autre plateforme hébergée", "Shopify / Wix / other hosted platform"],
    ["custom", "Développement sur mesure", "Custom website"],
    ["unknown", "Je ne sais pas", "Unknown"],
  ] },
  scope: { fr: "Précisez l’intervention ciblée", en: "Tell us about the targeted change", options: [
    ["local", "Une correction simple et localisée", "One simple, localised fix"],
    ["sensitive", "Paiement, accès au compte ou sécurité", "Payments, account access or security"],
    ["uncertain", "Plusieurs éléments / je ne sais pas", "Several elements / unsure"],
  ] },
  urgency: { fr: "Urgence de l’intervention", en: "Repair urgency", options: [
    ["normal", "Pas d’urgence bloquante", "No blocking urgency"],
    ["soon", "Dès que possible, site utilisable", "As soon as possible, website usable"],
    ["blocking", "Blocage ou urgence critique", "Blocking issue or critical urgency"],
  ] },
};
export const REPAIR_CATEGORIES = {
  small: { fr: "Petite intervention", en: "Small intervention", price: 70 },
  comprehensive: { fr: "Optimisation globale", en: "Comprehensive optimisation", price: 650 },
  technical: { fr: "Dépannage technique", en: "Technical troubleshooting", price: null },
  urgent: { fr: "Dépannage urgent", en: "Urgent troubleshooting", price: null },
};
export const REPAIR_TERMS = {
  small: {
    fr: "Prix de départ indicatif pour une intervention simple et ciblée éligible, limitée à une heure de travail convenue, sous réserve du diagnostic initial.",
    en: "Indicative starting price for an eligible simple, targeted intervention limited to one hour of agreed work, subject to initial diagnosis.",
  },
  comprehensive: {
    fr: "Amélioration globale du site, avec un périmètre explicitement convenu après diagnostic.",
    en: "Comprehensive website improvements, with a scope explicitly agreed after diagnosis.",
  },
  technical: {
    fr: "Problème complexe ou encore incertain : demandez un devis personnalisé après diagnostic pour définir le périmètre et le prix.",
    en: "Complex or uncertain problem: request a personalised quote after diagnosis to define the scope and price.",
  },
  urgent: {
    fr: "Site inaccessible, blocage ou urgence critique : demandez un devis personnalisé après diagnostic prioritaire, selon disponibilité.",
    en: "Inaccessible website, blocking issue or critical urgency: request a personalised quote after priority diagnosis, subject to availability.",
  },
  approval: {
    fr: "Le prix définitif est confirmé après diagnostic, avant le début des travaux. Aucun travail supplémentaire sans votre accord préalable. Le délai sera confirmé après diagnostic.",
    en: "The definitive price is confirmed after diagnosis, before work begins. No additional work without your prior approval. The timeline will be confirmed after diagnosis.",
  },
  privacy: {
    fr: "Indiquez uniquement l’adresse publique du site et le problème rencontré. Ne partagez aucun mot de passe, code d’accès, clé API ou autre secret. Ces champs restent dans cette page jusqu’à votre demande de devis ; ils ne sont pas envoyés aux outils de mesure d’audience.",
    en: "Only share the public website address and the problem you encountered. Do not share passwords, access codes, API keys or other secrets. These fields stay on this page until you request a quote; they are not sent to analytics.",
  },
};
export const needsRepairScope = ({ issue, intervention }) =>
  intervention === "targeted" && ["button", "display"].includes(issue);
const known = (key, value) => REPAIR_QUESTIONS[key].options.some(([id]) => id === value);

// Conservative routing only. Never uses generic content, features, urgency multipliers or deadlines.
export function getRepairEstimate(diagnostic = {}) {
  const d = diagnostic ?? {};
  let category = "technical";
  if (d.issue === "outage" || d.urgency === "blocking") category = "urgent";
  else if (["issue", "intervention", "platform", "urgency"].every(key => known(key, d[key])) &&
    ["wordpress", "hosted"].includes(d.platform) && ["button", "display", "performance"].includes(d.issue)) {
    if (d.intervention === "comprehensive") category = "comprehensive";
    else if (needsRepairScope(d) && d.scope === "local") category = "small";
  }
  const { price } = REPAIR_CATEGORIES[category];
  return { kind: "repair", need: REPAIR_NEED, category, price, billing: price === null ? "quote" : "from", delay: null };
}

// Preserve the locked engine byte-for-byte. Repair never enters its generic project calculation.
export function getDiagnosticEstimate({ project = null, repair, ...options } = {}) {
  if (project?.need !== REPAIR_NEED) return getUnifiedEstimate({ project, ...options });
  const result = getUnifiedEstimate({ ...options, project: null });
  const repairProject = getRepairEstimate(repair);
  // onQuote belongs to the existing complex-video block; repair uses its own billing field.
  return { ...result, project: repairProject };
}

const decodedText = value => {
  let text = String(value ?? "");
  try { text = decodeURIComponent(text); } catch { /* Inspect malformed input as supplied. */ }
  return text.normalize("NFKC");
};
// Best-effort guard for obvious credentials, not a guarantee that arbitrary text is secret-free.
export function containsObviousSecret(value) {
  const text = decodedText(value);
  return /-----BEGIN [A-Z ]*PRIVATE KEY-----|\bBearer\s+\S+|\b(?:sk-[A-Za-z0-9_-]{16,}|gh[pousr]_[A-Za-z0-9_]{16,}|github_pat_[A-Za-z0-9_]+|AKIA[A-Z0-9]{16})\b/i.test(text) ||
    /\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/.test(text) ||
    /\b(?:password|passwd|mot\s+de\s+passe|mdp|api[ _-]?key|cl[ée][ _-]?(?:api|secr[èe]te)|secret|token|access[ _-]?token|authorization|cookie|code[ _-]?(?:d['’]acc[èe]s|secret))\s*(?:[:=]|(?:is|est)\s+)\s*\S+/i.test(text) ||
    /https?:\/\/[^\s/]+@/i.test(text) || [...text].some(char => { const code = char.codePointAt(0); return code === 127 || (code < 32 && ![9, 10, 13].includes(code)); });
}
export function validateRepairDetails({ url = "", description = "" } = {}) {
  const errors = {};
  if (typeof description !== "string" || description.length > 1500) errors.description = "length";
  else if (containsObviousSecret(description)) errors.description = "secret";
  if (typeof url !== "string" || url.length > 500) errors.url = "url";
  else if (containsObviousSecret(url)) errors.url = "secret";
  else if (url.trim()) {
    try {
      const parsed = new URL(url.trim());
      // Public HTTP(S) address only, without credentials, query strings or fragments.
      if (!["http:", "https:"].includes(parsed.protocol) || parsed.username || parsed.password ||
        parsed.search || parsed.hash || /[?#]/.test(url) || !parsed.hostname.includes(".") ||
        /^(?:localhost|127\.|0\.|10\.|192\.168\.|169\.254\.|172\.(?:1[6-9]|2\d|3[01])\.)/i.test(parsed.hostname) ||
        /\.(?:local|internal)$/i.test(parsed.hostname)) errors.url = "url";
    } catch { errors.url = "url"; }
  }
  return errors;
}
export function getRepairSummary(diagnostic, { isEnglish = false, formatPrice, profile }) {
  if (Object.keys(validateRepairDetails(diagnostic)).length) throw new Error("Unsafe repair details");
  const lang = isEnglish ? "en" : "fr";
  const result = getRepairEstimate(diagnostic);
  const category = REPAIR_CATEGORIES[result.category];
  const lines = [
    (isEnglish ? "Profile: " : "Profil : ") + profile,
    (isEnglish ? "Preliminary category: " : "Catégorie préliminaire : ") + category[lang] + " — " +
      (result.price === null ? (isEnglish ? "on quote" : "sur devis") : (isEnglish ? "from " : "dès ") + formatPrice(result.price)),
  ];
  for (const key of ["issue", "intervention", "platform", ...(needsRepairScope(diagnostic) ? ["scope"] : []), "urgency"]) {
    const question = REPAIR_QUESTIONS[key];
    const option = question.options.find(([value]) => value === diagnostic[key]);
    lines.push(question[lang] + ": " + (option ? option[isEnglish ? 2 : 1] : (isEnglish ? "To be diagnosed" : "À diagnostiquer")));
  }
  if (diagnostic.url.trim()) lines.push((isEnglish ? "Website URL: " : "URL du site : ") + diagnostic.url.trim());
  if (diagnostic.description.trim()) lines.push((isEnglish ? "Problem description: " : "Description du problème : ") + diagnostic.description.trim());
  lines.push(REPAIR_TERMS[result.category][lang], REPAIR_TERMS.approval[lang]);
  return lines;
}
