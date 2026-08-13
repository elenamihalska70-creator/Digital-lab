// LOT DL SEO 5C.2 — Vercel's build image (Amazon Linux 2023) has no
// apt-get and isn't an officially supported Playwright OS, so
// `playwright install chromium --with-deps` fails there (exit 127).
// On Vercel, prerendering instead launches the self-contained binary
// from @sparticuz/chromium (see scripts/prerender.mjs), so Playwright's
// own browser download is only needed on other platforms (local dev,
// other CI), which is what this script restricts it to.
import { execSync } from "node:child_process";

if (!process.env.VERCEL) {
  execSync("playwright install chromium", { stdio: "inherit" });
}
