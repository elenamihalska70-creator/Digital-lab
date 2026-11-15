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

test("DL-GROWTH-TRACKING-01: this project's Vercel Preview and branch hosts are never tracked", () => {
  for (const hostname of [
    "digital-5ch2zx7fe-elenamihalska70-creators-projects.vercel.app",
    "digital-lab-git-feat-dl-growth-tracking-01-elenamihalska70-creators-projects.vercel.app",
    "digitallab.studio.vercel.app", "www.digitallab.studio.", "preview.www.digitallab.studio",
  ]) {
    assert.equal(isTrackingAllowed({ hostname, isProductionBuild: true }), false, hostname);
  }
});

test("trackEvent is a no-op when the production guard did not initialize gtag", async () => {
  const { trackEvent } = await import("./analytics.js");
  assert.equal(globalThis.window, undefined);
  assert.doesNotThrow(() => trackEvent("estimator_open", { estimator_variant: "main" }));
  globalThis.window = {};
  try {
    assert.doesNotThrow(() => trackEvent("estimator_open", { estimator_variant: "main" }));
    assert.equal(globalThis.window.dataLayer, undefined);
  } finally {
    delete globalThis.window;
  }
});
