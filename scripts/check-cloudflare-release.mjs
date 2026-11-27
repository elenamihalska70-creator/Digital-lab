import assert from "node:assert/strict";
import { pathToFileURL } from "node:url";
import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { seoRoutes } from "../seo-routes.config.js";

const project = "digital-lab-backup";
const branch = "ci-test";
const origin = `https://${branch}.${project}.pages.dev`;
const markerFile = "_standby-artifact.json";
const [command, ...args] = process.argv.slice(2);
const markerModes = {
  TEST: "No live submissions on any host",
  FAILOVER: "Live submissions only on digitallab.studio and www.digitallab.studio",
};

function markerMatches(marker, mode, commit, run) {
  assert.equal(marker.artifact, mode);
  assert.equal(marker.activation, markerModes[mode]);
  if (commit !== undefined) {
    assert.match(commit, /^[a-f0-9]{40}$/);
    assert.match(run, /^\d+-\d+$/);
    assert.equal(marker.commit, commit);
    assert.equal(marker.run, run);
  }
}

export async function inspectArtifact(directory, mode, commit, run) {
  assert.ok(Object.hasOwn(markerModes, mode));
  markerMatches(JSON.parse(await readFile(join(directory, markerFile))), mode, commit, run);
  const headers = await readFile(join(directory, "_headers"), "utf8");
  assert.ok(headers.includes("https://:project.pages.dev/*\n  X-Robots-Tag: noindex"));
  assert.ok(headers.includes("https://:version.:project.pages.dev/*\n  X-Robots-Tag: noindex"));
  assert.equal((headers.match(/X-Robots-Tag:/gi) ?? []).length, 2);
  if (mode === "TEST") assert.ok(headers.includes("Content-Security-Policy: connect-src 'none'; form-action 'none'"));
  await readFile(join(directory, "404.html"));
  let files = 0;
  async function checkEntries(relative = "") {
    for (const entry of await readdir(join(directory, relative), { withFileTypes: true })) {
      const path = join(relative, entry.name);
      assert.ok(!entry.name.startsWith(".") &&
        !["node_modules", "_worker.js", "_routes.json", "functions"].includes(entry.name),
        "Unexpected artifact path");
      if (entry.isDirectory()) await checkEntries(path);
      else {
        assert.ok(entry.isFile(), "Artifact entries must be regular files");
        const data = await readFile(join(directory, path));
        assert.ok(data.length <= 25 * 1024 ** 2, "Pages asset exceeds 25 MiB");
        files++;
      }
    }
  }
  await checkEntries();
  assert.ok(files > 0 && files <= 1000, "Artifact exceeds the manual upload fallback limit");
  for (const route of ["/", ...seoRoutes]) {
    const html = await readFile(join(directory, route, "index.html"), "utf8");
    const canonical = route === "/en" ? "/en/" : route;
    assert.ok(html.includes(`href="https://www.digitallab.studio${canonical}"`), `Missing canonical for ${route}`);
    if (mode === "TEST") {
      assert.ok(!/\bhref=["'](?:mailto:|tel:|https?:\/\/(?:a59f-contact\.systeme\.io|audit\.digitallab\.studio))/i.test(html),
        `Live submission link in ${route}`);
    }
  }
  console.log(`${mode} artifact validated: ${files} files`);
}

async function verifyPreviewBranch() {
  const account = process.env.CLOUDFLARE_ACCOUNT_ID;
  const token = process.env.CLOUDFLARE_API_TOKEN;
  assert.ok(account && /^[a-f0-9]{32}$/i.test(account) && token, "Cloudflare configuration is missing or invalid");
  const response = await fetch(`https://api.cloudflare.com/client/v4/accounts/${account}/pages/projects/${project}`, {
    headers: { Authorization: `Bearer ${token}` },
    redirect: "error",
    signal: AbortSignal.timeout(15000),
  });
  assert.ok(response.ok, `Cloudflare project lookup returned HTTP ${response.status}`);
  const { success, result } = await response.json();
  assert.ok(success && result?.name === project && result.subdomain === `${project}.pages.dev` &&
    typeof result.production_branch === "string" &&
    result.production_branch.length > 0 && result.production_branch !== branch,
    "Cannot establish that the selected branch is preview-only");
  console.log("Existing Pages project confirmed and ci-test is a preview branch");
}

async function get(path, method = "GET") {
  let url = new URL(path, origin);
  for (let i = 0; i < 4; i++) {
    assert.equal(url.origin, origin, "Cross-origin URL or redirect");
    const response = await fetch(url, { method, cache: "no-store", redirect: "manual", signal: AbortSignal.timeout(12000) });
    if (![301, 302, 303, 307, 308].includes(response.status)) return response;
    const location = response.headers.get("location");
    assert.ok(location, "Redirect is missing Location");
    url = new URL(location, url);
  }
  throw new Error("Too many redirects");
}

async function smoke(commit, run) {
  let fresh = false;
  for (let i = 0; i < 18; i++) {
    try {
      const response = await get(`/${markerFile}?run=${encodeURIComponent(run)}`);
      assert.equal(response.status, 200);
      markerMatches(await response.json(), "TEST", commit, run);
      fresh = true;
      break;
    } catch {
      await delay(5000);
    }
  }
  assert.ok(fresh, "Expected TEST deployment marker did not appear on the preview alias");
  for (const path of ["/", "/en/", "/politique-de-confidentialite", "/services/creation-site-web", "/login", "/dashboard", "/espace-client", "/admin"]) {
    const response = await get(path);
    assert.equal(response.status, 200, path);
    assert.match(response.headers.get("x-robots-tag") ?? "", /\bnoindex\b/i, path);
    const html = await response.text();
    if (["/login", "/dashboard", "/espace-client", "/admin"].includes(path)) {
      assert.match(html, /L’espace client n’est plus accessible en ligne/, path);
    }
    if (path !== "/") continue;
    assert.match(response.headers.get("content-security-policy") ?? "", /connect-src 'none'; form-action 'none'/i);
    for (const [extension, mime] of [["css", /text\/css/i], ["js", /javascript/i]]) {
      const asset = html.match(new RegExp(`(?:src|href)="(/assets/[^"]+\\.${extension})"`))?.[1];
      assert.ok(asset, `Missing ${extension} URL`);
      const resource = await get(asset);
      assert.equal(resource.status, 200, asset);
      assert.match(resource.headers.get("content-type") ?? "", mime);
      assert.ok((await resource.arrayBuffer()).byteLength > 0);
    }
  }
  for (const path of ["/api/send-contact-email", "/api/send-quote-email"]) {
    for (const method of ["GET", "HEAD", "POST"]) {
      const response = await get(path, method);
      assert.ok([404, 405, 410].includes(response.status), `${method} ${path} returned ${response.status}`);
    }
  }
  console.log(`Verified TEST preview: ${origin}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
if (command === "artifact" && [2, 4].includes(args.length)) await inspectArtifact(...args);
else if (command === "preview-guard" && args.length === 0) await verifyPreviewBranch();
else if (command === "smoke" && args.length === 2) await smoke(...args);
else throw new Error("Use artifact <directory> <mode> [commit run], preview-guard, or smoke <commit> <run>.");
}
