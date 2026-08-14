// LOT DL SEO 5C — post-build static prerender.
//
// Visits the known public SEO routes (root + seo-routes.config.js) against the
// freshly built dist/ output using a real headless browser (Playwright), so
// that Google/crawlers/social scrapers receive real per-route <title>,
// <meta description>, <link rel="canonical"> and Open Graph tags in the raw
// HTML response, instead of the homepage shell + client-JS-only metadata.
//
// This script does NOT own any SEO content. It only captures what the
// existing app already produces via pageMetadata / servicePages / projects /
// applyPageMetadata / setMetaContent / setCanonicalHref (src/App.jsx), which
// remain the single source of truth. No title/description/canonical/JSON-LD
// is hardcoded here.
//
// Routing, Supabase/auth, and analytics code are not modified by this
// script — it only intercepts network requests inside its own isolated
// Playwright browser context.
//
// Browser binary (LOT DL SEO 5C.2): Vercel's build image (Amazon Linux
// 2023) has no apt-get and isn't an officially supported Playwright OS, so
// Playwright's own downloaded Chromium can't launch there (missing shared
// libs) and `--with-deps` can't install them (no apt-get). On Vercel we
// instead launch the prebuilt, dependency-free binary from
// @sparticuz/chromium, which targets exactly this Amazon-Linux family.
// Everywhere else (local dev, other CI) we use Playwright's own bundled
// Chromium as before — see resolveLaunchOptions() and scripts/postinstall.mjs.

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { preview } from "vite";
import { seoRoutes } from "../seo-routes.config.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, "..");
const distDir = join(rootDir, "dist");

const SITE_URL = "https://www.digitallab.studio";
const PREVIEW_PORT = 4319;

// LOT DL 2.5 — vite-plugin-sitemap normalizes every dynamicRoutes entry
// through path.parse(), which unconditionally strips trailing slashes. That
// means the sitemap <loc> it writes for "/en" comes out as ".../en", even
// though the English homepage's canonical URL (and every other route) is
// ".../en/". This patches just that one entry after vite build has run.
function fixEnglishHomepageSitemapSlash() {
  const sitemapPath = join(distDir, "sitemap.xml");
  if (!existsSync(sitemapPath)) {
    return;
  }

  const original = readFileSync(sitemapPath, "utf8");
  const bareEnUrl = `${SITE_URL}/en`;
  const pattern = new RegExp(`${bareEnUrl.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(\\s*</loc>)`);
  const patched = original.replace(pattern, `${bareEnUrl}/$1`);

  if (patched !== original) {
    writeFileSync(sitemapPath, patched, "utf8");
  }
}

// Domains that must never receive real traffic during prerendering.
// Analytics/Clarity: avoid polluting real GA4/Clarity data with build-time
// hits. Supabase: keep the prerender anonymous and avoid build-time
// network flakiness — a blocked request simply resolves to "no session",
// which is the correct anonymous state for public marketing pages anyway.
const BLOCKED_HOST_PATTERNS = [
  /(^|\.)googletagmanager\.com$/,
  /(^|\.)google-analytics\.com$/,
  /(^|\.)clarity\.ms$/,
  /\.supabase\.co$/,
];

const routesToPrerender = ["/", ...seoRoutes];

// "/" and "/en" (the English homepage) are the only two routes whose
// canonical URL carries a trailing slash — every other route's canonical is
// slash-free (see pageMetadata / servicePages in src/App.jsx).
const expectedCanonicalFor = (route) => {
  if (route === "/") return `${SITE_URL}/`;
  if (route === "/en") return `${SITE_URL}/en/`;
  return `${SITE_URL}${route}`;
};

const outputPathFor = (route) =>
  route === "/" ? join(distDir, "index.html") : join(distDir, route.replace(/^\//, ""), "index.html");

const shouldBlockRequest = (url) => {
  try {
    const { hostname } = new URL(url);
    return BLOCKED_HOST_PATTERNS.some((pattern) => pattern.test(hostname));
  } catch {
    return false;
  }
};

async function withBlockedTracking(page) {
  await page.route("**/*", (route) => {
    const url = route.request().url();
    if (shouldBlockRequest(url)) {
      return route.abort();
    }
    return route.continue();
  });
}

async function renderRoute(context, baseUrl, route) {
  // A dedicated page per route (not a dedicated BrowserContext): on Vercel,
  // Chromium runs with @sparticuz/chromium's `--single-process` flag (needed
  // to satisfy the build container's sandbox), under which repeatedly
  // creating/closing BrowserContexts is known to be unstable. A fresh Page
  // in one shared context gives the same per-route isolation for the
  // tracking-block guarantee below without that risk.
  const page = await context.newPage();
  await withBlockedTracking(page);
  const pageErrors = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));

  try {
    // "networkidle" is unreliable here (the app has ongoing background
    // activity — carousels, observers — that never fully settles), so we
    // wait for the actual React commit instead of a network heuristic.
    await page.goto(`${baseUrl}${route}`, { waitUntil: "load", timeout: 30000 });
    await page.waitForFunction(() => (document.getElementById("root")?.children.length ?? 0) > 0, {
      timeout: 10000,
    });
    // Let React's passive effects (applyPageMetadata, trackPageView) settle.
    await page.waitForTimeout(300);

    const title = await page.title();
    const canonical = await page.getAttribute('link[rel="canonical"]', "href");
    const rootChildCount = await page.evaluate(
      () => document.getElementById("root")?.children.length ?? 0,
    );
    const html = await page.content();

    return { title, canonical, rootChildCount, html, pageErrors };
  } finally {
    await page.close();
  }
}

async function verifyWrittenRoute(context, baseUrl, route) {
  const page = await context.newPage();
  await withBlockedTracking(page);
  const pageErrors = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));

  try {
    await page.goto(`${baseUrl}${route}`, { waitUntil: "load", timeout: 30000 });
    await page.waitForFunction(() => (document.getElementById("root")?.children.length ?? 0) > 0, {
      timeout: 10000,
    });
    await page.waitForTimeout(300);
    const rootChildCount = await page.evaluate(
      () => document.getElementById("root")?.children.length ?? 0,
    );
    return { rootChildCount, pageErrors };
  } finally {
    await page.close();
  }
}

async function resolveLaunchOptions() {
  if (!process.env.VERCEL) {
    return { headless: true };
  }
  // Imported only on Vercel: this package is a Linux-only prebuilt binary
  // and must never be loaded on local/non-Linux dev machines.
  const { default: sparticuzChromium } = await import("@sparticuz/chromium");
  return {
    executablePath: await sparticuzChromium.executablePath(),
    args: sparticuzChromium.args,
    headless: true,
  };
}

async function main() {
  fixEnglishHomepageSitemapSlash();

  const previewServer = await preview({
    root: rootDir,
    preview: { port: PREVIEW_PORT, strictPort: true },
  });
  const baseUrl = previewServer.resolvedUrls.local[0].replace(/\/$/, "");

  const browser = await chromium.launch(await resolveLaunchOptions());
  const context = await browser.newContext();

  const results = [];
  const failures = [];

  try {
    for (const route of routesToPrerender) {
      const { title, canonical, rootChildCount, html, pageErrors } = await renderRoute(
        context,
        baseUrl,
        route,
      );

      const expectedCanonical = expectedCanonicalFor(route);
      const routeFailures = [];

      if (pageErrors.length > 0) {
        routeFailures.push(`page error(s) during render: ${pageErrors.join(" | ")}`);
      }
      if (!title || title.trim().length === 0) {
        routeFailures.push("empty <title>");
      }
      if (!canonical) {
        routeFailures.push("missing <link rel=\"canonical\">");
      } else if (canonical !== expectedCanonical) {
        routeFailures.push(`canonical mismatch: expected "${expectedCanonical}", got "${canonical}"`);
      }
      if (route !== "/" && canonical === expectedCanonicalFor("/")) {
        routeFailures.push("canonical points to the homepage instead of this route");
      }
      if (rootChildCount === 0) {
        routeFailures.push("body has no rendered content (#root is empty)");
      }

      results.push({ route, title, canonical, rootChildCount, ok: routeFailures.length === 0 });

      if (routeFailures.length > 0) {
        failures.push({ route, reasons: routeFailures });
        continue;
      }

      const outputPath = outputPathFor(route);
      mkdirSync(dirname(outputPath), { recursive: true });
      writeFileSync(outputPath, html, "utf8");
    }

    // Section 9 — sanity pass: reload every file we just wrote (over the
    // now-mutated dist/) and confirm the client bundle still mounts cleanly
    // on top of the prerendered markup, with no page errors.
    for (const route of routesToPrerender) {
      if (failures.some((failure) => failure.route === route)) {
        continue;
      }
      const { rootChildCount, pageErrors } = await verifyWrittenRoute(context, baseUrl, route);
      if (pageErrors.length > 0 || rootChildCount === 0) {
        failures.push({
          route,
          reasons: [
            "post-write reload check failed",
            ...(pageErrors.length > 0 ? [`page error(s): ${pageErrors.join(" | ")}`] : []),
            ...(rootChildCount === 0 ? ["client re-render produced no content"] : []),
          ],
        });
      }
    }

    // LOT DL 2.5.1 — "/en" above only ever exercises the slash-free form.
    // "/en/" (with the trailing slash) is the literal canonical/sitemap URL,
    // so it's the one a search engine or a user actually lands on — reload
    // it explicitly to confirm it hydrates too, not just its bare variant.
    if (!failures.some((failure) => failure.route === "/en")) {
      const { rootChildCount, pageErrors } = await verifyWrittenRoute(context, baseUrl, "/en/");
      if (pageErrors.length > 0 || rootChildCount === 0) {
        failures.push({
          route: "/en/",
          reasons: [
            "trailing-slash reload check failed",
            ...(pageErrors.length > 0 ? [`page error(s): ${pageErrors.join(" | ")}`] : []),
            ...(rootChildCount === 0 ? ["client re-render produced no content"] : []),
          ],
        });
      }
    }
  } finally {
    await context.close();
    await browser.close();
    await previewServer.close();
  }

  console.log("\nPrerender summary:");
  console.table(
    results.map((result) => ({
      route: result.route,
      title: result.title,
      canonical: result.canonical,
      rootChildren: result.rootChildCount,
      status: failures.some((failure) => failure.route === result.route) ? "FAIL" : "OK",
    })),
  );

  if (failures.length > 0) {
    console.error("\nPrerender FAILED for the following routes:\n");
    for (const failure of failures) {
      console.error(`  ${failure.route}`);
      for (const reason of failure.reasons) {
        console.error(`    - ${reason}`);
      }
    }
    process.exitCode = 1;
    return;
  }

  console.log(`\nPrerendered ${routesToPrerender.length} routes successfully.`);
}

main().catch((error) => {
  console.error("Prerender script crashed:", error);
  process.exitCode = 1;
});
