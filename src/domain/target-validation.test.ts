import test, { describe } from "node:test";
import assert from "node:assert/strict";
import { validateTargetInput } from "./target-validation.ts";

describe("validateTargetInput", () => {
  test("accepts public-looking domains and http(s) URLs", () => {
    const cases = new Map([
      ["example.com", "example.com"],
      [" Example.COM ", "example.com"],
      ["www.example.com", "example.com"],
      ["https://example.com/path?x=1", "example.com"],
      ["http://www.example.com", "example.com"],
      ["x.com", "x.com"],
    ]);

    for (const [input, expectedDomain] of cases) {
      const result = validateTargetInput(input);
      assert.equal(result.valid, true, input);
      assert.equal(result.domain, expectedDomain, input);
    }
  });

  test("rejects unsafe or non-public-looking inputs", () => {
    const cases = [
      "hello",
      "192.168.1.1",
      "127.0.0.1",
      "::1",
      "localhost",
      "router.local",
      "javascript:alert(1)",
      "<script>alert(1)</script>",
      "example .com",
      "https://user:pass@example.com",
      "https://example.com:8443",
      "http://:3000",
      "ftp://example.com",
      "example.com/path",
    ];

    for (const input of cases) {
      const result = validateTargetInput(input);
      assert.equal(result.valid, false, input);
    }
  });
});
