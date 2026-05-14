import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

test("home page does not render the unfinished report panel", () => {
  const source = readFileSync(new URL("./home-page-client.tsx", import.meta.url), "utf8");

  assert.doesNotMatch(source, /<ReportForm\b/);
});

test("home page validates search input before starting the server check", () => {
  const source = readFileSync(new URL("./home-page-client.tsx", import.meta.url), "utf8");

  const validationIndex = source.indexOf("validateTargetInput(input)");
  const runCheckIndex = source.indexOf("await runCheck");

  assert.notEqual(validationIndex, -1);
  assert.notEqual(runCheckIndex, -1);
  assert.equal(validationIndex < runCheckIndex, true);
  assert.match(source, /t\("search\.invalid"\)/);
});
