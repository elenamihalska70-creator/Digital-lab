import assert from "node:assert/strict";
import { readFile, writeFile, mkdtemp, cp } from "node:fs/promises";
import { createHash } from "node:crypto";
import { tmpdir } from "node:os";
import { resolve, join } from "node:path";
import { pathToFileURL } from "node:url";
import { spawnSync } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";
import {
  identity,
  verifyRelease,
  githubApi,
  publicPrimary,
  bounded,
  Pending,
} from "./check-main-release.mjs";
import { inspectArtifact } from "./check-cloudflare-release.mjs";
export const project = "digital-lab-backup",
  branch = "standby",
  origin = "https://standby.digital-lab-backup.pages.dev";
export function checksum(data, expected) {
  assert.match(expected ?? "", /^[a-f0-9]{64}$/);
  assert.equal(
    createHash("sha256").update(data).digest("hex"),
    expected,
    "FAILOVER checksum mismatch",
  );
}
export function projectIdentity(p) {
  assert.equal(p.name, project);
  assert.equal(p.subdomain, project + ".pages.dev");
  assert.ok(
    p.production_branch &&
      !["standby", "ci-test"].includes(p.production_branch),
    "Unsafe Pages production branch",
  );
  assert.ok(p.canonical_deployment?.id, "Root deployment identity unavailable");
  return {
    root: p.canonical_deployment.id,
    productionBranch: p.production_branch,
    domains: [...(p.domains ?? [])].sort(),
  };
}
export function deploymentIdentity(d, sha) {
  assert.equal(d.environment, "preview", "Wrong Cloudflare environment");
  assert.equal(
    d.deployment_trigger?.metadata?.branch,
    branch,
    "Wrong Cloudflare branch",
  );
  assert.equal(
    d.deployment_trigger.metadata.commit_hash,
    sha,
    "Wrong Cloudflare SHA",
  );
  const match = /^standby:([1-9][0-9]*-[1-9][0-9]*):([a-f0-9]{64})$/.exec(
    d.deployment_trigger.metadata.commit_message ?? "",
  );
  assert.ok(match, "Untraceable standby deployment");
  assert.equal(
    d.latest_stage?.status,
    "success",
    "Cloudflare deployment not successful",
  );
  return { run: match[1], checksum: match[2], deployment: d.id };
}
export async function standbySmoke(sha, run, fetcher = fetch) {
  const get = async (path) => {
    let url = new URL(path, origin);
    for (let i = 0; i < 4; i++) {
      assert.equal(url.origin, origin, "Standby cross-origin redirect");
      const r = await fetcher(url.href, {
        method: "GET",
        redirect: "manual",
        cache: "no-store",
        signal: AbortSignal.timeout(12000),
      });
      if ([301, 302, 303, 307, 308].includes(r.status)) {
        const location = r.headers.get("location");
        assert.ok(location, "Redirect missing location");
        url = new URL(location, url);
        continue;
      }
      assert.equal(r.status, 200, "Standby smoke HTTP: " + path);
      return r;
    }
    throw new Error("Standby redirect limit");
  };
  const marker = await (
    await get("/_standby-artifact.json?sync=" + encodeURIComponent(run))
  ).json();
  assert.equal(marker.artifact, "FAILOVER", "TEST artifact rejected");
  assert.equal(marker.commit, sha);
  assert.equal(marker.run, run);
  assert.equal(
    marker.activation,
    "Live submissions only on digitallab.studio and www.digitallab.studio",
  );
  for (const path of [
    "/",
    "/en/",
    "/politique-de-confidentialite",
    "/services/creation-site-web",
    "/login",
    "/dashboard",
    "/espace-client",
    "/admin",
  ]) {
    const r = await get(path);
    assert.match(r.headers.get("x-robots-tag") ?? "", /noindex/i);
    const html = await r.text();
    assert.ok(
      html.includes("https://www.digitallab.studio"),
      "Missing primary canonical",
    );
    assert.ok(
      !/\bhref=["'](?:mailto:|tel:|https?:\/\/(?:a59f-contact\.systeme\.io|audit\.digitallab\.studio))/i.test(
        html,
      ),
      "Live action in standby HTML",
    );
    if (["/login", "/dashboard", "/espace-client", "/admin"].includes(path))
      assert.ok(
        html.includes("accessible en ligne"),
        "Missing portal retirement notice",
      );
    if (path === "/")
      for (const [ext, mime] of [
        ["css", /text\/css/i],
        ["js", /javascript/i],
      ]) {
        const asset = html.match(
          new RegExp('(?:src|href)="(/assets/[^"?]+\\.' + ext + ')"'),
        )?.[1];
        assert.ok(asset, "Missing " + ext);
        const a = await get(asset);
        assert.match(a.headers.get("content-type") ?? "", mime);
        assert.ok((await a.arrayBuffer()).byteLength);
      }
  }
  for (const p of ["/api/send-contact-email", "/api/send-quote-email"]) {
    const r = await fetcher(origin + p, {
      method: "GET",
      redirect: "error",
      signal: AbortSignal.timeout(12000),
    });
    assert.ok(
      [404, 405, 410].includes(r.status),
      "Legacy API unexpectedly active",
    );
  }
}
export async function synchronize({
  id,
  expectedChecksum,
  cf,
  release,
  previous,
  upload,
  smoke,
  sleep = () => delay(5000),
}) {
  await release();
  const before = projectIdentity(await cf(""));
  try {
    const list = await cf("/deployments?env=preview&per_page=100");
    assert.ok(Array.isArray(list));
    const deployments = list
      .filter((d) => d.deployment_trigger?.metadata?.branch === branch)
      .sort((a, b) => Date.parse(b.created_on) - Date.parse(a.created_on));
    const latest = deployments[0];
    let selected,
      uploaded = false;
    if (latest) await previous(latest.deployment_trigger.metadata.commit_hash);
    if (
      latest &&
      !["success", "failure", "canceled"].includes(latest.latest_stage?.status)
    )
      throw new Error(
        "Pending/uncertain standby upload; reconcile before retry",
      );
    if (
      latest?.latest_stage?.status === "success" &&
      latest.deployment_trigger.metadata.commit_hash === id.sha
    )
      selected = latest;
    else {
      await release();
      assert.deepEqual(
        projectIdentity(await cf("")),
        before,
        "Root changed before upload",
      );
      // No blind retry of an external write. Reconcile even if the uploader reports failure.
      let uploadError;
      try {
        uploaded = true;
        await upload(
          "standby:" + id.run + "-" + id.attempt + ":" + expectedChecksum,
        );
      } catch (e) {
        uploadError = e;
      }
      for (let i = 0; i < 18; i++) {
        const rows = await cf("/deployments?env=preview&per_page=100");
        selected = rows.find(
          (d) =>
            d.deployment_trigger?.metadata?.branch === branch &&
            d.deployment_trigger.metadata.commit_hash === id.sha &&
            d.deployment_trigger.metadata.commit_message ===
              "standby:" + id.run + "-" + id.attempt + ":" + expectedChecksum,
        );
        if (selected?.latest_stage?.status === "success") break;
        if (
          selected &&
          ["failure", "canceled"].includes(selected.latest_stage?.status)
        )
          throw new Error(
            "Cloudflare deployment failed; rerun only after reconciliation",
          );
        if (i < 17) await sleep();
      }
      if (!selected || selected.latest_stage?.status !== "success")
        throw new Error(
          "Upload outcome unresolved; do not blindly retry" +
            (uploadError ? " (uploader failed)" : ""),
        );
    }
    const deployed = deploymentIdentity(selected, id.sha);
    try {
      await bounded(
        () =>
          smoke(id.sha, deployed.run).catch(() => {
            throw new Pending("Standby smoke not healthy");
          }),
        { attempts: 6, sleep },
      );
    } finally {
      assert.deepEqual(
        projectIdentity(await cf("")),
        before,
        "CRITICAL: Pages root or mapping changed",
      );
    }
    await release();
    return {
      schema: 1,
      commit: id.sha,
      requestedRun: id.run + "-" + id.attempt,
      artifactChecksum: deployed.checksum,
      sourceRun: deployed.run,
      deployment: deployed.deployment,
      uploaded,
      origin,
      rootPreserved: true,
      smoke: "success",
    };
  } finally {
    assert.deepEqual(
      projectIdentity(await cf("")),
      before,
      "CRITICAL: Pages root or mapping changed",
    );
  }
}
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  try {
    const id = identity(process.env);
    assert.equal(
      process.env.STANDBY_SYNC_ENABLED,
      "true",
      "Standby synchronization is disabled",
    );
    const expectedChecksum = process.env.EXPECTED_CHECKSUM;
    const archive = "received-standby/FAILOVER-" + id.sha + ".tar.gz";
    checksum(await readFile(archive), expectedChecksum);
    await inspectArtifact(
      "verified-standby",
      "FAILOVER",
      id.sha,
      id.run + "-" + id.attempt,
    );
    const api = githubApi(process.env.GH_TOKEN);
    const release = () => verifyRelease(id, api, publicPrimary);
    const account = process.env.CLOUDFLARE_ACCOUNT_ID;
    assert.match(account ?? "", /^[a-f0-9]{32}$/i);
    assert.ok(process.env.CLOUDFLARE_API_TOKEN);
    const cf = async (suffix) => {
      const r = await fetch(
        "https://api.cloudflare.com/client/v4/accounts/" +
          account +
          "/pages/projects/" +
          project +
          suffix,
        {
          headers: {
            Authorization: "Bearer " + process.env.CLOUDFLARE_API_TOKEN,
          },
          redirect: "error",
          signal: AbortSignal.timeout(15000),
        },
      );
      assert.ok(r.ok, "Cloudflare read failed: " + r.status);
      const b = await r.json();
      assert.equal(b.success, true);
      if (Array.isArray(b.result) && b.result_info?.total_count > 100)
        throw Error(
          "Deployment history exceeds bounded lookup; reconcile manually",
        );
      return b.result;
    };
    const upload = async (message) => {
      const root = await mkdtemp(join(tmpdir(), "dl-standby-"));
      await cp("verified-standby", join(root, "site"), { recursive: true });
      const tool = resolve(
        ".github/wrangler/node_modules/wrangler/bin/wrangler.js",
      );
      const r = spawnSync(
        process.execPath,
        [
          tool,
          "pages",
          "deploy",
          "site",
          "--project-name",
          project,
          "--branch",
          branch,
          "--commit-hash",
          id.sha,
          "--commit-dirty=false",
          "--commit-message",
          message,
        ],
        {
          cwd: root,
          env: Object.fromEntries(
            Object.entries(process.env).filter(
              ([key]) => key !== "GH_TOKEN" && key !== "GITHUB_TOKEN",
            ),
          ),
          stdio: "inherit",
          timeout: 180000,
        },
      );
      assert.equal(
        r.status,
        0,
        "Wrangler upload failed; reconcile deployment records",
      );
    };
    const previous = async (sha) => {
      assert.match(sha ?? "", /^[a-f0-9]{40}$/);
      const comparison = await api("/compare/" + sha + "..." + id.sha);
      assert.ok(
        ["ahead", "identical"].includes(comparison.status),
        "Existing standby is newer or divergent; refusing overwrite",
      );
    };
    const result = await synchronize({
      id,
      expectedChecksum,
      cf,
      release,
      previous,
      upload,
      smoke: standbySmoke,
    });
    await writeFile(
      "validation.local/standby-result.json",
      JSON.stringify(result, null, 2),
    );
    console.log(JSON.stringify(result));
  } catch (e) {
    console.error("Standby sync failed (no automatic rollback): " + e.message);
    process.exitCode = 1;
  }
}
