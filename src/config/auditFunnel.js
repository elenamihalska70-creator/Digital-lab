import { publicActionHref } from "./standby.js";

const funnelUrl = "https://a59f-contact.systeme.io/audit-gratuit";

const locations = new Set([
  "global_nav",
  "audit_page_nav",
  "homepage_hero",
  "en_homepage_hero",
  "homepage_spotlight",
  "homepage_portfolio",
  "homepage_mobile_sticky",
  "audit_landing_primary",
  "footer_reminder",
  "creation_hero",
  "creation_footer",
  "besancon_hero",
  "besancon_footer",
]);

export function auditFunnelHref(location) {
  if (!locations.has(location)) throw new Error("Unknown audit CTA location");
  const url = new URL(funnelUrl);
  url.search = new URLSearchParams({
    utm_source: "digitallab",
    utm_medium: "website",
    utm_campaign: "audit_gratuit",
    utm_content: location,
  }).toString();
  return publicActionHref(url.href);
}
