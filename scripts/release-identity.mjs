import assert from "node:assert/strict";
export const repository = "elenamihalska70-creator/Digital-lab";
export function releaseIdentity(env) {
  if (env.VERCEL === "1") {
    assert.match(env.VERCEL_GIT_COMMIT_SHA ?? "", /^[a-f0-9]{40}$/);
    assert.equal(env.VERCEL_GIT_REPO_OWNER, "elenamihalska70-creator");
    assert.equal((env.VERCEL_GIT_REPO_SLUG ?? "").toLowerCase(), "digital-lab");
    assert.ok(["production", "preview"].includes(env.VERCEL_ENV));
    if (env.VERCEL_ENV === "production")
      assert.equal(env.VERCEL_GIT_COMMIT_REF, "main");
    return {
      schema: 1,
      provider: "vercel",
      repository,
      commit: env.VERCEL_GIT_COMMIT_SHA,
      branch: env.VERCEL_GIT_COMMIT_REF,
      environment: env.VERCEL_ENV,
    };
  }
  return { schema: 1, provider: "local", environment: "local" };
}
export function assertPrimary(marker, sha) {
  assert.deepEqual(
    marker,
    {
      schema: 1,
      provider: "vercel",
      repository,
      commit: sha,
      branch: "main",
      environment: "production",
    },
    "Primary domain does not serve this exact production release",
  );
}
