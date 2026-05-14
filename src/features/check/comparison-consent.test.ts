import test from "node:test";
import assert from "node:assert/strict";
import { shouldRunComparisonProbe } from "./comparison-consent.ts";

test("comparison probes require explicit consent and available targets", () => {
  assert.equal(shouldRunComparisonProbe(false, ["x.com"]), false);
  assert.equal(shouldRunComparisonProbe(true, []), false);
  assert.equal(shouldRunComparisonProbe(true, ["x.com"]), true);
});
