// Single source of truth for the known, indexable public SEO routes (non-root).
// Consumed by:
// - vite.config.js (vite-plugin-sitemap)
// - scripts/prerender.mjs (post-build static prerender)
//
// Do NOT add private routes (/login, /dashboard, /espace-client, /admin, /design-system),
// the bare /services path, or unknown slugs here.
export const seoRoutes = [
  "/audit-site-web",
  "/projects/microassist",
  "/projects/socle-local",
  "/projects/microassist-expert",
  "/projects/assistant-reservation-ia",
  "/services/automatisation-pme",
  "/services/chatbot-ia",
  "/services/creation-site-web",
  "/services/creation-site-web-besancon",
  "/mentions-legales",
];
