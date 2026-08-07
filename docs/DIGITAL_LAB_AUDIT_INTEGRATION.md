# Digital Lab Audit integration

Digital Lab remains the central brand and ecosystem. Digital Lab Audit is the low-friction entry point for visitors who need a clear website diagnosis before deciding whether to request support.

## Public journey

Visitor lands on Digital Lab, sees the free audit CTA, opens `/audit-site-web`, understands what the audit checks, then launches the separately deployed audit application. After the diagnosis, Digital Lab can help turn the priorities into concrete improvements.

## Route and destination

- Public SEO route: `/audit-site-web`
- Homepage spotlight anchor: `/#audit-gratuit`
- External audit application URL: `VITE_DIGITAL_LAB_AUDIT_URL`
- Audit video asset: `/videos/Digitallab_audit.mp4`

Set `VITE_DIGITAL_LAB_AUDIT_URL` in the production environment when the public audit application URL is approved. Keep the URL centralized; do not hard-code it in page components.

If the audit application URL is missing, the public page disables the launch button, shows a beta availability message, and logs only a safe developer-console warning. It must never render environment variable names to public visitors.

The audit video reuses the existing `DeferredVideo` implementation and project-media interaction treatment. Do not add a separate demo modal, overlay CTA, or iframe architecture for the audit preview.

## SEO

The audit route sets:

- Title: `Audit de site web gratuit pour TPE et indépendants | Digital Lab`
- Description: `Analysez gratuitement votre site : visibilité, confiance, sécurité, RGPD, performance et conversion. Recevez les priorités à traiter, expliquées simplement.`
- Canonical: `https://www.digitallab.studio/audit-site-web`
- Structured data: `WebApplication`, `Service`, `BreadcrumbList`, and visible FAQ content.

The route is included in the generated sitemap through `vite.config.js`.

## Analytics events

Existing Google Analytics is reused. Events avoid personal data, email, and user-submitted URLs.

- `audit_home_cta_click`
- `audit_nav_click`
- `audit_landing_cta_click`
- `audit_external_app_click`
- `audit_video_play`
- `audit_footer_cta_click`
- `audit_assistance_click`

Each event includes `cta_location` and a safe `destination_type`.

## Video preview boundary

The approved audit preview video lives at `public/videos/Digitallab_audit.mp4` and is referenced as `/videos/Digitallab_audit.mp4`. It must stay in `public/videos`; do not import it into JavaScript.

The video must keep the existing delayed `src` attachment behavior from `DeferredVideo`: `preload` starts as `none`, then switches to `metadata` only when the lazy-loading observer attaches the source.

## Integration boundaries

Do not embed the audit application in an iframe for this LOT. Do not copy the audit codebase into this repository unless a future architecture decision explicitly supports a safe monorepo. Do not index individual audit result pages.
