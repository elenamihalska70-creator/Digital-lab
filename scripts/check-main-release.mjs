import assert from "node:assert/strict";
import { writeFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { setTimeout as delay } from "node:timers/promises";
import { assertPrimary, repository } from "./release-identity.mjs";
export class Pending extends Error {}
export function identity(env) {
  assert.equal(env.GITHUB_REPOSITORY, repository);
  assert.equal(env.GITHUB_REF, "refs/heads/main");
  assert.equal(env.GITHUB_EVENT_NAME, "push");
  assert.equal(env.GITHUB_REF_PROTECTED, "true");
  assert.match(env.GITHUB_SHA ?? "", /^[a-f0-9]{40}$/);
  assert.match(env.GITHUB_RUN_ID ?? "", /^[1-9][0-9]*$/);
  assert.match(env.GITHUB_RUN_ATTEMPT ?? "", /^[1-9][0-9]*$/);
  return {
    sha: env.GITHUB_SHA,
    run: env.GITHUB_RUN_ID,
    attempt: env.GITHUB_RUN_ATTEMPT,
  };
}
export async function verifyRelease(id, api, primary) {
  const branch = await api("/branches/main");
  assert.equal(branch.commit.sha, id.sha, "Stale run: main has advanced");
  assert.equal(branch.protected, true);
  const run = await api("/actions/runs/" + id.run);
  assert.equal(run.head_sha, id.sha);
  assert.equal(run.head_branch, "main");
  assert.equal(run.event, "push");
  assert.equal(run.path, ".github/workflows/cloudflare-standby.yml");
  assert.equal(String(run.run_attempt), id.attempt, "Superseded run attempt");
  const jobs = await api(
    "/actions/runs/" +
      id.run +
      "/attempts/" +
      id.attempt +
      "/jobs?per_page=100",
  );
  assert.equal(jobs.total_count <= 100, true);
  const verify = jobs.jobs.filter((j) => j.name === "verify");
  assert.equal(verify.length, 1);
  assert.equal(
    verify[0].conclusion,
    "success",
    "Exact-run verify did not succeed",
  );
  const pricing = await api(
    "/actions/workflows/pricing.yml/runs?event=push&head_sha=" +
      id.sha +
      "&per_page=100",
  );
  const candidates = pricing.workflow_runs
    .filter(
      (r) =>
        r.head_sha === id.sha && r.head_branch === "main" && r.event === "push",
    )
    .sort((a, b) => b.id - a.id);
  if (!candidates.length || candidates[0].status !== "completed")
    throw new Pending("Waiting for exact-SHA pricing");
  assert.equal(candidates[0].conclusion, "success", "Exact-SHA pricing failed");
  const deployments = await api(
    "/deployments?sha=" + id.sha + "&environment=Production&per_page=100",
  );
  const trusted = deployments
    .filter(
      (d) =>
        d.sha === id.sha &&
        d.environment === "Production" &&
        d.creator?.id === 35613825 &&
        d.creator?.login === "vercel[bot]",
    )
    .sort((a, b) => b.id - a.id);
  if (!trusted.length)
    throw new Pending("Waiting for Vercel Production deployment");
  const statuses = await api(
    "/deployments/" + trusted[0].id + "/statuses?per_page=100",
  );
  const latest = statuses[0];
  if (!latest || ["pending", "queued", "in_progress"].includes(latest.state))
    throw new Pending("Waiting for Vercel Production success");
  assert.equal(latest.creator?.id, 35613825, "Untrusted deployment status");
  assert.equal(latest.state, "success", "Vercel Production failed or inactive");
  const url = new URL(latest.environment_url);
  assert.equal(url.protocol, "https:");
  assert.ok(
    url.hostname.endsWith(".vercel.app") ||
      url.hostname === "www.digitallab.studio",
  );
  const marker = await primary();
  if (
    marker?.provider === "vercel" &&
    marker.environment === "production" &&
    marker.branch === "main" &&
    marker.commit !== id.sha
  )
    throw new Pending("Waiting for primary domain release identity");
  assertPrimary(marker, id.sha);
  // Recheck after all external reads. Deployment approval delays must not permit stale uploads.
  assert.equal(
    (await api("/branches/main")).commit.sha,
    id.sha,
    "Stale run after release checks",
  );
  return {
    schema: 1,
    ...id,
    pricingRun: candidates[0].id,
    vercelDeployment: trusted[0].id,
    primary: "https://www.digitallab.studio",
  };
}
export async function bounded(
  check,
  { attempts = 40, sleep = () => delay(15000) } = {},
) {
  let last;
  for (let i = 0; i < attempts; i++) {
    try {
      return await check();
    } catch (e) {
      if (!(e instanceof Pending)) throw e;
      last = e;
      if (i + 1 < attempts) await sleep();
    }
  }
  throw new Error("Release wait expired: " + last?.message);
}
export function githubApi(token, fetcher = fetch) {
  return async (path) => {
    assert.ok(path.startsWith("/") && !path.includes(".."));
    const r = await fetcher(
      "https://api.github.com/repos/" + repository + path,
      {
        headers: {
          Authorization: "Bearer " + token,
          Accept: "application/vnd.github+json",
          "X-GitHub-Api-Version": "2022-11-28",
        },
        redirect: "error",
        signal: AbortSignal.timeout(15000),
      },
    );
    if (r.status >= 500 || r.status === 429)
      throw new Pending("GitHub temporarily unavailable");
    assert.ok(r.ok, "GitHub lookup failed: " + r.status);
    return r.json();
  };
}
export async function publicPrimary(fetcher = fetch) {
  let r;
  try {
    r = await fetcher(
      "https://www.digitallab.studio/_release.json?standby-sync=1",
      {
        cache: "no-store",
        redirect: "error",
        signal: AbortSignal.timeout(15000),
      },
    );
  } catch {
    throw new Pending("Primary marker unavailable");
  }
  if (!r.ok) throw new Pending("Primary marker not yet available");
  let marker;
  try {
    marker = await r.json();
  } catch {
    throw new Pending("Primary marker not yet JSON");
  }
  return marker;
}
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  try {
    const id = identity(process.env);
    const receipt = await bounded(() =>
      verifyRelease(id, githubApi(process.env.GH_TOKEN), publicPrimary),
    );
    await writeFile(
      "validation.local/release-receipt.json",
      JSON.stringify(receipt),
    );
    console.log("Exact-SHA production release verified");
  } catch (e) {
    console.error("Release verification failed: " + e.message);
    process.exitCode = 1;
  }
}
