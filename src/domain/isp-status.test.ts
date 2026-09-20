import test from "node:test";
import assert from "node:assert/strict";
import { ispStatus, isRestricted } from "./isp-status.ts";

test("ok, unblocked, ND and blank are not restrictions", () => {
  for (const value of ["ok", "OK", "unblocked", "Unblocked", "ND", "nd", "", "  "]) {
    assert.equal(isRestricted(value), false, `${value} should not count as restricted`);
  }
});

test("unblocked and ND stay distinguishable from ok", () => {
  assert.equal(ispStatus("ok"), "ok");
  assert.equal(ispStatus("unblocked"), "unblocked");
  assert.equal(ispStatus("ND"), "no_data");
  assert.equal(ispStatus(""), "no_data");
});

test("every other value is a restriction and keeps its method text", () => {
  for (const value of ["DNS", "HTTP/HTTPS", "DNS+TCP IP", "TCP IP+HTTP/HTTPS"]) {
    assert.equal(isRestricted(value), true, `${value} should count as restricted`);
    assert.equal(ispStatus(value), "restricted");
  }
});
