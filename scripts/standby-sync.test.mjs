import test from "node:test";
import assert from "node:assert/strict";
import { readFile, mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createHash } from "node:crypto";
import {
  releaseIdentity,
  assertPrimary,
  repository,
} from "./release-identity.mjs";
import {
  identity,
  verifyRelease,
  bounded,
  Pending,
  githubApi,
} from "./check-main-release.mjs";
import {
  checksum,
  projectIdentity,
  deploymentIdentity,
  synchronize,
  standbySmoke,
} from "./sync-standby.mjs";
import { safeListing } from "./prepare-standby.mjs";
import { inspectArtifact } from "./check-cloudflare-release.mjs";
const sha = "a".repeat(40),
  hash = "b".repeat(64),
  id = { sha, run: "12", attempt: "1" };
const env = {
  GITHUB_REPOSITORY: repository,
  GITHUB_REF: "refs/heads/main",
  GITHUB_EVENT_NAME: "push",
  GITHUB_REF_PROTECTED: "true",
  GITHUB_SHA: sha,
  GITHUB_RUN_ID: "12",
  GITHUB_RUN_ATTEMPT: "1",
};
const marker = {
  schema: 1,
  provider: "vercel",
  repository,
  commit: sha,
  branch: "main",
  environment: "production",
};
function apiFixture(change = {}) {
  const values = {
    "/branches/main": { protected: true, commit: { sha } },
    "/actions/runs/12": {
      head_sha: sha,
      head_branch: "main",
      event: "push",
      path: ".github/workflows/cloudflare-standby.yml",
      run_attempt: 1,
    },
    "/actions/runs/12/attempts/1/jobs?per_page=100": {
      total_count: 2,
      jobs: [{ name: "verify", conclusion: "success" }],
    },
    ["/actions/workflows/pricing.yml/runs?event=push&head_sha=" +
    sha +
    "&per_page=100"]: {
      workflow_runs: [
        {
          id: 55,
          head_sha: sha,
          head_branch: "main",
          event: "push",
          status: "completed",
          conclusion: "success",
        },
      ],
    },
    ["/deployments?sha=" + sha + "&environment=Production&per_page=100"]: [
      {
        id: 6,
        sha,
        environment: "Production",
        creator: { id: 35613825, login: "vercel[bot]" },
      },
    ],
    "/deployments/6/statuses?per_page=100": [
      {
        state: "success",
        creator: { id: 35613825 },
        environment_url: "https://digital-fixture.vercel.app",
      },
    ],
    ...change,
  };
  return async (p) => {
    assert.ok(Object.hasOwn(values, p), p);
    return structuredClone(values[p]);
  };
}
test("release marker allowlists identity, excludes secrets and labels previews", () => {
  const v = {
    VERCEL: "1",
    VERCEL_ENV: "production",
    VERCEL_GIT_COMMIT_SHA: sha,
    VERCEL_GIT_COMMIT_REF: "main",
    VERCEL_GIT_REPO_OWNER: "elenamihalska70-creator",
    VERCEL_GIT_REPO_SLUG: "Digital-lab",
    SECRET: "synthetic-secret",
  };
  assert.deepEqual(releaseIdentity(v), marker);
  assert(!JSON.stringify(releaseIdentity(v)).includes("synthetic-secret"));
  assert.throws(() =>
    assertPrimary(releaseIdentity({ ...v, VERCEL_ENV: "preview" }), sha),
  );
  assert.throws(() => releaseIdentity({ ...v, VERCEL_GIT_COMMIT_SHA: "bad" }));
  assert.throws(() =>
    releaseIdentity({ ...v, VERCEL_GIT_COMMIT_REF: "feature" }),
  );
  assert.throws(() => assertPrimary(releaseIdentity({}), sha));
});
test("only protected main push is eligible", () => {
  assert.deepEqual(identity(env), id);
  for (const patch of [
    { GITHUB_EVENT_NAME: "pull_request" },
    { GITHUB_REF: "refs/heads/feature" },
    { GITHUB_REF_PROTECTED: "false" },
    { GITHUB_SHA: "short" },
    { GITHUB_REPOSITORY: "foreign/repo" },
  ])
    assert.throws(() => identity({ ...env, ...patch }));
});
test("exact release joins verify, pricing, trusted Production and public marker", async () => {
  const r = await verifyRelease(id, apiFixture(), async () => marker);
  assert.equal(r.pricingRun, 55);
  assert.equal(r.vercelDeployment, 6);
});
test("wrong SHA, stale main, failed verify and superseded attempts rejected", async () => {
  for (const patch of [
    { "/branches/main": { protected: true, commit: { sha: "c".repeat(40) } } },
    { "/actions/runs/12": { head_sha: "wrong" } },
    {
      "/actions/runs/12/attempts/1/jobs?per_page=100": {
        total_count: 1,
        jobs: [{ name: "verify", conclusion: "failure" }],
      },
    },
    {
      "/actions/runs/12": {
        head_sha: sha,
        head_branch: "main",
        event: "push",
        path: ".github/workflows/cloudflare-standby.yml",
        run_attempt: 2,
      },
    },
  ])
    await assert.rejects(
      verifyRelease(id, apiFixture(patch), async () => marker),
    );
});
test("failed exact-SHA pricing is terminal; PR checks cannot substitute", async () => {
  const key =
    "/actions/workflows/pricing.yml/runs?event=push&head_sha=" +
    sha +
    "&per_page=100";
  await assert.rejects(
    verifyRelease(
      id,
      apiFixture({
        [key]: {
          workflow_runs: [
            {
              id: 1,
              head_sha: sha,
              head_branch: "main",
              event: "push",
              status: "completed",
              conclusion: "failure",
            },
          ],
        },
      }),
      async () => marker,
    ),
    /pricing failed/,
  );
  await assert.rejects(
    verifyRelease(
      id,
      apiFixture({
        [key]: {
          workflow_runs: [
            {
              id: 1,
              head_sha: sha,
              head_branch: "main",
              event: "pull_request",
              status: "completed",
              conclusion: "success",
            },
          ],
        },
      }),
      async () => marker,
    ),
    Pending,
  );
});
test("Preview, untrusted Vercel actor and inactive Production rejected", async () => {
  await assert.rejects(
    verifyRelease(id, apiFixture(), async () => ({
      ...marker,
      environment: "preview",
    })),
  );
  const key =
    "/deployments?sha=" + sha + "&environment=Production&per_page=100";
  for (const d of [
    {
      id: 6,
      sha,
      environment: "Preview",
      creator: { id: 35613825, login: "vercel[bot]" },
    },
    {
      id: 6,
      sha,
      environment: "Production",
      creator: { id: 4, login: "someone" },
    },
  ])
    await assert.rejects(
      verifyRelease(id, apiFixture({ [key]: [d] }), async () => marker),
      Pending,
    );
  await assert.rejects(
    verifyRelease(
      id,
      apiFixture({
        "/deployments/6/statuses?per_page=100": [
          {
            state: "inactive",
            creator: { id: 35613825 },
            environment_url: "https://example.vercel.app",
          },
        ],
      }),
      async () => marker,
    ),
  );
});
test("bounded waits retry Pending only and never mask terminal errors", async () => {
  let n = 0;
  assert.equal(
    await bounded(
      async () => {
        if (++n < 3) throw new Pending("wait");
        return 7;
      },
      { attempts: 3, sleep: async () => {} },
    ),
    7,
  );
  await assert.rejects(
    bounded(
      async () => {
        throw new Pending("wait");
      },
      { attempts: 2, sleep: async () => {} },
    ),
    /expired/,
  );
  n = 0;
  await assert.rejects(
    bounded(
      async () => {
        n++;
        throw Error("failed");
      },
      { attempts: 3, sleep: async () => {} },
    ),
    /failed/,
  );
  assert.equal(n, 1);
});
test("GitHub HTTP client is read-only and does not follow credential redirects", async () => {
  const api = githubApi("synthetic", async (url, opt) => {
    assert(url.startsWith("https://api.github.com/repos/" + repository + "/"));
    assert.equal(opt.redirect, "error");
    assert.equal(opt.method, undefined);
    return { ok: true, json: async () => ({ ok: true }) };
  });
  assert.deepEqual(await api("/branches/main"), { ok: true });
  await assert.rejects(api("/../other"));
});
const project = {
  name: "digital-lab-backup",
  subdomain: "digital-lab-backup.pages.dev",
  production_branch: "production",
  canonical_deployment: { id: "root-1" },
  domains: ["existing.example"],
};
const deployment = (patch = {}) => ({
  id: "dep-1",
  created_on: "2026-11-22T10:00:00Z",
  environment: "preview",
  latest_stage: { status: "success" },
  deployment_trigger: {
    metadata: {
      branch: "standby",
      commit_hash: sha,
      commit_message: "standby:12-1:" + hash,
    },
  },
  ...patch,
});
test("project and deployment guards reject production mapping and wrong branch", () => {
  assert.equal(projectIdentity(project).root, "root-1");
  for (const p of [
    { ...project, name: "other" },
    { ...project, production_branch: "standby" },
    { ...project, production_branch: "ci-test" },
    { ...project, canonical_deployment: null },
  ])
    assert.throws(() => projectIdentity(p));
  assert.equal(deploymentIdentity(deployment(), sha).run, "12-1");
  assert.throws(() =>
    deploymentIdentity(deployment({ environment: "production" }), sha),
  );
  assert.throws(() =>
    deploymentIdentity(
      deployment({
        deployment_trigger: {
          metadata: { branch: "ci-test", commit_hash: sha },
        },
      }),
      sha,
    ),
  );
  assert.throws(() => deploymentIdentity(deployment(), "d".repeat(40)));
});
test("checksum and tar safety fail closed", () => {
  const b = Buffer.from("archive"),
    h = createHash("sha256").update(b).digest("hex");
  checksum(b, h);
  assert.throws(() => checksum(b, hash));
  safeListing("./\n./index.html\n", "drwx x\n-rw x\n");
  for (const name of ["../escape", "/absolute", "a/../b", "a\\b"])
    assert.throws(() => safeListing(name, "-rw x"));
  assert.throws(() => safeListing("link", "lrwx x"));
});
test("TEST artifact cannot enter FAILOVER upload", async () => {
  const dir = await mkdtemp(join(tmpdir(), "dl-mode-test-"));
  try {
    await writeFile(
      join(dir, "_standby-artifact.json"),
      JSON.stringify({ artifact: "TEST" }),
    );
    await assert.rejects(inspectArtifact(dir, "FAILOVER", sha, "12-1"));
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
function scenario(initial = [], options = {}) {
  let records = structuredClone(initial),
    writes = 0,
    releaseCalls = 0,
    root = structuredClone(project);
  const args = {
    id,
    expectedChecksum: hash,
    cf: async (suffix) =>
      suffix ? structuredClone(records) : structuredClone(root),
    release: async () => {
      releaseCalls++;
      if (options.staleAt && releaseCalls >= options.staleAt)
        throw Error("Stale main");
    },
    previous: async () => {
      if (options.newer) throw Error("Existing standby newer or divergent");
    },
    upload: async () => {
      writes++;
      records = [deployment()];
      if (options.rootChanged) root.canonical_deployment.id = "changed";
      if (options.uncertain) throw Error("lost response");
    },
    smoke: async () => {
      if (options.smokeFail) throw Error("bad smoke");
    },
    sleep: async () => {},
  };
  return { args, writes: () => writes };
}
test("integration: one verified upload, traceable result and root preserved", async () => {
  const s = scenario();
  const r = await synchronize(s.args);
  assert.equal(s.writes(), 1);
  assert.equal(r.smoke, "success");
  assert.equal(r.commit, sha);
  assert.equal(r.rootPreserved, true);
});
test("integration: duplicate healthy SHA reuses deployment without upload", async () => {
  const s = scenario([deployment()]);
  const r = await synchronize(s.args);
  assert.equal(s.writes(), 0);
  assert.equal(r.uploaded, false);
});
test("integration: stale run after approval and newer standby cannot upload", async () => {
  for (const s of [
    scenario([], { staleAt: 2 }),
    scenario([deployment()], { newer: true }),
  ]) {
    await assert.rejects(synchronize(s.args));
    assert.equal(s.writes(), 0);
  }
});
test("integration: uncertain pending deployment blocks blind duplicate", async () => {
  const s = scenario([deployment({ latest_stage: { status: "active" } })]);
  await assert.rejects(synchronize(s.args), /uncertain/);
  assert.equal(s.writes(), 0);
});
test("integration: lost upload response reconciles without second upload", async () => {
  const s = scenario([], { uncertain: true });
  const r = await synchronize(s.args);
  assert.equal(s.writes(), 1);
  assert.equal(r.smoke, "success");
});
test("integration: smoke failure reports failure; no rollback or second upload", async () => {
  const s = scenario([], { smokeFail: true });
  await assert.rejects(synchronize(s.args), /smoke/);
  assert.equal(s.writes(), 1);
});
test("integration: any root change is a critical failure", async () => {
  const s = scenario([], { rootChanged: true });
  await assert.rejects(synchronize(s.args), /CRITICAL/);
  assert.equal(s.writes(), 1);
});
function smokeFetch({ mode = "FAILOVER", badAsset = false } = {}) {
  return async (url, opt) => {
    assert(url.startsWith("https://standby.digital-lab-backup.pages.dev/"));
    assert.equal(opt.method, "GET");
    assert.ok(["manual", "error"].includes(opt.redirect));
    const u = new URL(url);
    if (u.pathname.includes("_standby-artifact"))
      return Response.json({
        artifact: mode,
        commit: sha,
        run: "12-1",
        activation:
          "Live submissions only on digitallab.studio and www.digitallab.studio",
      });
    if (u.pathname.startsWith("/api/"))
      return new Response("", { status: 410 });
    if (u.pathname.startsWith("/assets/"))
      return new Response("asset", {
        status: badAsset ? 404 : 200,
        headers: {
          "content-type": u.pathname.endsWith(".css")
            ? "text/css"
            : "application/javascript",
        },
      });
    return new Response(
      '<link rel="canonical" href="https://www.digitallab.studio/"><link href="/assets/a.css"><script src="/assets/a.js"></script>accessible en ligne',
      { headers: { "x-robots-tag": "noindex" } },
    );
  };
}
test("dedicated standby smoke checks FAILOVER, assets, legacy routes without writes", async () => {
  await standbySmoke(sha, "12-1", smokeFetch());
  await assert.rejects(
    standbySmoke(sha, "12-1", smokeFetch({ mode: "TEST" })),
    /TEST/,
  );
  await assert.rejects(
    standbySmoke(sha, "12-1", smokeFetch({ badAsset: true })),
    /HTTP/,
  );
});
test("workflow keeps privacy gate, independent opt-in, environment and exact artifacts", async () => {
  const w = await readFile(
    new URL("../.github/workflows/cloudflare-standby.yml", import.meta.url),
    "utf8",
  );
  for (const n of [
    "npm run check:privacy-date",
    "CLOUDFLARE_TEST_DEPLOY_ENABLED",
    "CLOUDFLARE_STANDBY_SYNC_ENABLED",
    "needs: verify",
    "name: cloudflare-test",
    "cancel-in-progress: false",
    "failover_sha256",
    "node --test scripts/standby-sync.test.mjs",
  ])
    assert(w.includes(n), n);
  assert(!w.includes("continue-on-error"));
  assert(!w.includes("contents: write"));
  assert(w.includes("inputs.deploy_test == true"));
});

test("late main advancement is rejected after remote verification", async () => {
  let n = 0;
  const base = apiFixture();
  await assert.rejects(
    verifyRelease(
      id,
      async (p) =>
        p === "/branches/main" && ++n > 1
          ? { commit: { sha: "f".repeat(40) } }
          : base(p),
      async () => marker,
    ),
    /Stale/,
  );
});
test("old primary marker is bounded pending, not a false success", async () => {
  await assert.rejects(
    verifyRelease(id, apiFixture(), async () => ({
      ...marker,
      commit: "f".repeat(40),
    })),
    Pending,
  );
});
test("integration: unresolved upload outcome fails after bounded reconciliation", async () => {
  const s = scenario();
  s.args.upload = async () => {
    throw Error("unknown");
  };
  await assert.rejects(synchronize(s.args), /outcome unresolved/);
});
test("integration: exact new FAILOVER archive is extracted and checked; damaged and TEST archives fail", async () => {
  const { mkdir } = await import("node:fs/promises");
  const { spawnSync } = await import("node:child_process");
  const { prepare } = await import("./prepare-standby.mjs");
  const { seoRoutes } = await import("../seo-routes.config.js");
  const root = await mkdtemp(join(tmpdir(), "dl-archive-integration-")),
    old = process.cwd();
  const make = async (mode) => {
    await mkdir(join(root, "source"), { recursive: true });
    await writeFile(
      join(root, "source/_standby-artifact.json"),
      JSON.stringify({
        artifact: mode,
        commit: sha,
        run: "12-1",
        activation:
          mode === "FAILOVER"
            ? "Live submissions only on digitallab.studio and www.digitallab.studio"
            : "No live submissions on any host",
      }),
    );
    await writeFile(
      join(root, "source/_headers"),
      "https://:project.pages.dev/*\n  X-Robots-Tag: noindex\nhttps://:version.:project.pages.dev/*\n  X-Robots-Tag: noindex",
    );
    await writeFile(join(root, "source/404.html"), "404");
    for (const route of ["/", ...seoRoutes]) {
      const dir = join(root, "source", route);
      await mkdir(dir, { recursive: true });
      await writeFile(
        join(dir, "index.html"),
        '<link href="https://www.digitallab.studio' +
          (route === "/en" ? "/en/" : route) +
          '">',
      );
    }
    await mkdir(join(root, "received-standby"), { recursive: true });
    const archive = join(root, "received-standby/FAILOVER-" + sha + ".tar.gz");
    const r = spawnSync(
      "tar",
      ["-czf", archive, "-C", join(root, "source"), "."],
      { encoding: "utf8" },
    );
    assert.equal(r.status, 0);
    return createHash("sha256")
      .update(await readFile(archive))
      .digest("hex");
  };
  try {
    const h = await make("FAILOVER");
    process.chdir(root);
    await prepare({ ...env, EXPECTED_CHECKSUM: h });
    assert(
      (
        await readFile("verified-standby/_standby-artifact.json", "utf8")
      ).includes("FAILOVER"),
    );
    await assert.rejects(
      prepare({ ...env, EXPECTED_CHECKSUM: hash }),
      /checksum/,
    );
    await rm("verified-standby", { recursive: true });
    const h2 = await make("TEST");
    await assert.rejects(prepare({ ...env, EXPECTED_CHECKSUM: h2 }));
  } finally {
    process.chdir(old);
    await rm(root, { recursive: true, force: true });
  }
});

test("manual TEST job and TEST smoke remain unchanged", async () => {
  const w = (
    await readFile(
      new URL("../.github/workflows/cloudflare-standby.yml", import.meta.url),
      "utf8",
    )
  ).replaceAll("\r\n", "\n");
  assert.equal(
    createHash("sha256")
      .update(
        w
          .slice(w.indexOf("  deploy-test:"), w.indexOf("  sync-standby:"))
          .trim(),
      )
      .digest("hex"),
    "5a42c1f2d41ef2f0ebae7732fc04fd27f5d0e56e35aaa54e9ab62092f5c75ba7",
  );
  const s = (
    await readFile(
      new URL("./check-cloudflare-release.mjs", import.meta.url),
      "utf8",
    )
  ).replaceAll("\r\n", "\n");
  assert.equal(
    createHash("sha256")
      .update(
        s
          .slice(
            s.indexOf("async function smoke(commit, run) {"),
            s.indexOf("if (process.argv[1]"),
          )
          .trim(),
      )
      .digest("hex"),
    "a105bbdab0bf4eaef7d0a5292ff7d1d3d6056252697912c769a25c11c36498fa",
  );
});

test("standby smoke follows only bounded same-origin redirects", async () => {
  const base = smokeFetch();
  await standbySmoke(sha, "12-1", async (url, opt) =>
    new URL(url).pathname === "/login"
      ? new Response(null, { status: 308, headers: { location: "/login/" } })
      : base(url, opt),
  );
  await assert.rejects(
    standbySmoke(sha, "12-1", async (url, opt) =>
      new URL(url).pathname === "/login"
        ? new Response(null, {
            status: 302,
            headers: { location: "https://www.digitallab.studio/login" },
          })
        : base(url, opt),
    ),
    /cross-origin/,
  );
  await assert.rejects(
    standbySmoke(
      sha,
      "12-1",
      async () =>
        new Response(null, { status: 302, headers: { location: "/loop" } }),
    ),
    /limit/,
  );
});
