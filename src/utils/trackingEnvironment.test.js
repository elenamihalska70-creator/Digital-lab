import assert from "node:assert/strict";
import test from "node:test";
import { isTrackingAllowed, TRACKING_HOSTNAMES } from "./trackingEnvironment.js";

test("Only the two production domains are tracked", () => {
  assert.deepEqual(TRACKING_HOSTNAMES, ["digitallab.studio", "www.digitallab.studio"]);
  for (const hostname of ["digitallab.studio", "www.digitallab.studio", "WWW.DigitalLab.studio"]) {
    assert.equal(isTrackingAllowed({ hostname, isProductionBuild: true }), true, hostname);
  }
});

test("Local, private, preview and look-alike hosts are never tracked", () => {
  for (const hostname of [
    "localhost", "127.0.0.1", "[::1]", "192.168.1.20", "10.0.0.5", "my-pc.local", "",
    "digital-lab-git-feat-sm.vercel.app", "digital-lab.vercel.app", "audit.digitallab.studio",
    "digitallab.studio.evil.com", "notdigitallab.studio",
  ]) {
    assert.equal(isTrackingAllowed({ hostname, isProductionBuild: true }), false, hostname);
  }
});

test("Development builds are never tracked, whatever the host", () => {
  assert.equal(isTrackingAllowed({ hostname: "www.digitallab.studio", isProductionBuild: false }), false);
});
