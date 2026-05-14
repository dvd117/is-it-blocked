import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

test("home page does not render the unfinished report panel", () => {
  const source = readFileSync(new URL("./home-page-client.tsx", import.meta.url), "utf8");

  assert.doesNotMatch(source, /<ReportForm\b/);
});
