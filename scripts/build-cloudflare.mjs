import { spawnSync } from "node:child_process";
import { readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { cloudflareBuild } from "../cloudflare-build.config.js";

const artifact = process.argv[2];
if (process.argv.length !== 3 || !["TEST", "FAILOVER"].includes(artifact)) {
  throw new Error("Choose exactly one artifact: npm run build:cloudflare -- TEST or FAILOVER.");
}
if (process.env.VERCEL) throw new Error("Build Cloudflare artifacts outside Vercel.");

const mode = `cloudflare-${artifact.toLowerCase()}`;
process.env.DL_CLOUDFLARE_ARTIFACT = artifact;
const { outDir } = cloudflareBuild(mode);
const root = fileURLToPath(new URL("../", import.meta.url));
const output = join(root, outDir);
const manifest = join(output, "_standby-artifact.json");
const env = Object.fromEntries(Object.entries(process.env).filter(([key]) => !key.startsWith("VITE_")));
env.NODE_ENV = "production";

function run(cmd, args) {
  const result = spawnSync(cmd, args, { cwd: root, env, stdio: "inherit" });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`${cmd} failed (${result.status ?? result.signal})`);
}

rmSync(manifest, { force: true });
run(process.execPath, ["node_modules/vite/bin/vite.js", "build", "--mode", mode]);
run(process.execPath, ["scripts/prerender.mjs", mode]);

// A top-level 404 disables Pages' automatic SPA fallback for unmatched routes.
writeFileSync(join(output, "404.html"), '<!doctype html><html lang="fr"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>404 – Digital Lab</title><main><h1>Page introuvable / Page not found</h1><a href="/">Retour à l’accueil / Home</a></main></html>\n');
writeFileSync(join(output, "_headers"), [
  "https://:project.pages.dev/*",
  "  X-Robots-Tag: noindex",
  "https://:version.:project.pages.dev/*",
  "  X-Robots-Tag: noindex",
  ...(artifact === "TEST" ? ["/*", "  Content-Security-Policy: connect-src 'none'; form-action 'none'"] : []),
  "",
].join("\n"));

function listFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? listFiles(path) : [path];
  });
}

const files = listFiles(output);
const sizes = files.map(file => statSync(file).size);
const marker = JSON.stringify({
  artifact,
  activation: artifact === "TEST" ? "No live submissions on any host" : "Live submissions only on digitallab.studio and www.digitallab.studio",
}, null, 2) + "\n";
const count = files.length + 1;
const maximum = Math.max(...sizes, Buffer.byteLength(marker));
if (count > 1000 || maximum > 25 * 1024 ** 2) throw new Error(`Pages upload limits exceeded: ${count} files, ${maximum} bytes maximum`);
writeFileSync(manifest, marker);
console.log(`${artifact}: ${outDir}, ${count} files, ${sizes.reduce((total, size) => total + size, Buffer.byteLength(marker))} bytes, max ${maximum} bytes`);
