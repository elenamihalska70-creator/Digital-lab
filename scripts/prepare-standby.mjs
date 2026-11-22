import assert from "node:assert/strict";
import { mkdir, readFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { pathToFileURL } from "node:url";
import { identity } from "./check-main-release.mjs";
import { checksum } from "./sync-standby.mjs";
import { inspectArtifact } from "./check-cloudflare-release.mjs";
export function safeListing(names, types) {
  for (const name of names.trim().split("\n"))
    assert.ok(
      name &&
        !name.startsWith("/") &&
        !name.includes("\\") &&
        !name.split("/").includes(".."),
      "Unsafe archive path",
    );
  for (const row of types.trim().split("\n"))
    assert.ok(
      row.startsWith("-") || row.startsWith("d"),
      "Archive links/special entries forbidden",
    );
}
export async function prepare(env = process.env) {
  const id = identity(env),
    archive = "received-standby/FAILOVER-" + id.sha + ".tar.gz";
  checksum(await readFile(archive), env.EXPECTED_CHECKSUM);
  const tar = (args) => {
    const r = spawnSync("tar", args, {
      encoding: "utf8",
      maxBuffer: 4 * 1024 * 1024,
    });
    assert.equal(r.status, 0, "Archive operation failed");
    return r.stdout;
  };
  safeListing(tar(["-tzf", archive]), tar(["-tvzf", archive]));
  await mkdir("verified-standby");
  tar([
    "-xzf",
    archive,
    "--no-same-owner",
    "--no-same-permissions",
    "-C",
    "verified-standby",
  ]);
  await inspectArtifact(
    "verified-standby",
    "FAILOVER",
    id.sha,
    id.run + "-" + id.attempt,
  );
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href)
  await prepare();
