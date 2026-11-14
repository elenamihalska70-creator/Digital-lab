import test from "node:test";
import assert from "node:assert/strict";
import { pricingSourceHash, verifyPricingLock, LOCKED_PRICING_PATHS, LOCKED_PACKAGE_PATHS } from "./pricing-lock.mjs";

const fixtureLock = source => ({ files: Object.fromEntries(LOCKED_PRICING_PATHS.map(path => [path, pricingSourceHash(source)])) });

test("Price lock accepts its exact source and normalizes CRLF", () => {
  const source = "approved price: 390\n";
  verifyPricingLock(fixtureLock(source), () => source.replaceAll("\n","\r\n"));
});
test("Accidental price or engine changes fail with the original lock", () => {
  const lock = fixtureLock("price:390");
  assert.throws(() => verifyPricingLock(lock, () => "price:399"), /Requires a separate LOT/);
  assert.throws(() => verifyPricingLock({files:{}}, () => ""), /Empty pricing lock/);
  assert.throws(() => verifyPricingLock({files:{source:pricingSourceHash("price:390")}}, () => "price:390"), /Incomplete pricing lock coverage/);
});
test("V4 package lock covers exactly the package configuration and rejects V3 coverage", () => {
  const packageLock = { files: Object.fromEntries(LOCKED_PACKAGE_PATHS.map(path => [path, pricingSourceHash("seo:190")])) };
  verifyPricingLock(packageLock, () => "seo:190", LOCKED_PACKAGE_PATHS);
  assert.throws(() => verifyPricingLock(packageLock, () => "seo:440", LOCKED_PACKAGE_PATHS), /Requires a separate LOT/);
  assert.throws(() => verifyPricingLock(packageLock, () => "seo:190"), /Incomplete pricing lock coverage/);
  assert.throws(() => verifyPricingLock(fixtureLock("x"), () => "x", LOCKED_PACKAGE_PATHS), /Incomplete pricing lock coverage/);
});
test("A rewritten checksum can accept changed code: it is not owner authorization", () => {
  const changedSource = "price:399";
  verifyPricingLock(fixtureLock(changedSource), () => changedSource);
});
