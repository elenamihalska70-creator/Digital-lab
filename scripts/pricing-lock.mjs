import assert from "node:assert/strict";
import { createHash } from "node:crypto";

export const pricingSourceHash = (source) => createHash("sha256")
  .update(source.replaceAll("\r\n", "\n")).digest("hex");

export const LOCKED_PRICING_PATHS = [
  "src/utils/websitePricing.js", "src/utils/estimator.js", "src/utils/quoteMailto.js",
  "src/config/taxMention.js", "scripts/check-release.mjs",
];

// Detects accidental edits; owner review is enforced outside this checksum.
export function verifyPricingLock(lock, readSource) {
  assert.ok(lock.files && Object.keys(lock.files).length > 0, "Empty pricing lock");
  assert.deepEqual(Object.keys(lock.files).sort(), [...LOCKED_PRICING_PATHS].sort(), "Incomplete pricing lock coverage");
  for (const [path, expected] of Object.entries(lock.files)) {
    assert.equal(pricingSourceHash(readSource(path)), expected,
      "Pricing contract changed: " + path + ". Requires a separate LOT and owner approval.");
  }
}
