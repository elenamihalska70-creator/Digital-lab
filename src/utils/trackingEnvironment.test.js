import assert from "node:assert/strict";
import test from "node:test";
import { isLocalHostname, isTrackingAllowed } from "./trackingEnvironment.js";

test("Local and private hosts are never tracked", () => {
  for (const hostname of ["localhost", "app.localhost", "127.0.0.1", "0.0.0.0", "[::1]", "::1", "192.168.1.20", "10.0.0.5", "172.20.3.4", "my-pc.local", ""]) {
    assert.equal(isLocalHostname(hostname), true, hostname);
    assert.equal(isTrackingAllowed({ hostname, isProductionBuild: true }), false, hostname);
  }
});

test("Development builds are never tracked, whatever the host", () => {
  assert.equal(isTrackingAllowed({ hostname: "www.digitallab.studio", isProductionBuild: false }), false);
});

test("Production builds on the public domain keep tracking", () => {
  for (const hostname of ["www.digitallab.studio", "digitallab.studio", "172.32.0.1"]) {
    assert.equal(isTrackingAllowed({ hostname, isProductionBuild: true }), true, hostname);
  }
});
