import test, { describe, mock } from "node:test";
import assert from "node:assert";
import dns from "dns/promises";
import { probeDomain } from "./server-probe.ts";

function rejectWith(message: string) {
  return () => Promise.reject(new Error(message));
}

describe("probeDomain", () => {
  test("DNS resolution failure returns expected result", async () => {
    mock.method(dns, "resolve4", rejectWith("ENOTFOUND"));
    mock.method(dns, "resolve6", rejectWith("ENOTFOUND"));
    const result = await probeDomain("this-domain-definitely-does-not-exist.local");
    assert.strictEqual(result.reachable, false);
    assert.strictEqual(result.dnsResolved, false);
    assert.deepStrictEqual(result.resolvedIps, []);
    assert.strictEqual(result.httpStatus, null);
    assert.strictEqual(result.responseTimeMs, null);
    assert.ok(result.error && result.error.includes("DNS resolution failed"));
    mock.restoreAll();
  });

  test("HTTP request success", async () => {
    mock.method(dns, "resolve4", () => Promise.resolve(["1.2.3.4"]));
    mock.method(dns, "resolve6", rejectWith("ENODATA"));
    const fetchMock = mock.method(global, "fetch", async () => ({
      status: 200,
    } as Response));

    const result = await probeDomain("example.com");

    assert.strictEqual(fetchMock.mock.callCount(), 1);
    const fetchCall = fetchMock.mock.calls[0];
    assert.strictEqual(fetchCall.arguments[0], "https://example.com");
    assert.strictEqual(fetchCall.arguments[1]?.method, "HEAD");
    assert.ok(fetchCall.arguments[1]?.signal instanceof AbortSignal);

    assert.strictEqual(result.reachable, true);
    assert.strictEqual(result.dnsResolved, true);
    assert.deepStrictEqual(result.resolvedIps, ["1.2.3.4"]);
    assert.strictEqual(result.httpStatus, 200);
    assert.ok(typeof result.responseTimeMs === "number");
    assert.strictEqual(result.error, null);

    mock.restoreAll();
  });

  test("HTTP error (4xx/5xx)", async () => {
    mock.method(dns, "resolve4", () => Promise.resolve(["1.2.3.4"]));
    mock.method(dns, "resolve6", rejectWith("ENODATA"));
    mock.method(global, "fetch", async () => ({
      status: 503,
    } as Response));

    const result = await probeDomain("example.com");
    assert.strictEqual(result.reachable, true);
    assert.strictEqual(result.httpStatus, 503);
    assert.strictEqual(result.error, null);
    mock.restoreAll();
  });

  test("Network error after DNS success", async () => {
    mock.method(dns, "resolve4", () => Promise.resolve(["1.2.3.4"]));
    mock.method(dns, "resolve6", rejectWith("ENODATA"));
    mock.method(global, "fetch", () => Promise.reject(new Error("ECONNREFUSED")));

    const result = await probeDomain("example.com");
    assert.strictEqual(result.reachable, false);
    assert.strictEqual(result.httpStatus, null);
    assert.ok(result.error && result.error.includes("HTTP request failed"));
    mock.restoreAll();
  });

  test("HTTP request timeout", async () => {
    mock.method(dns, "resolve4", () => Promise.resolve(["1.2.3.4"]));
    mock.method(dns, "resolve6", rejectWith("ENODATA"));
    mock.method(global, "fetch", () => {
      const error = new Error("The operation was aborted");
      error.name = "AbortError";
      return Promise.reject(error);
    });

    const result = await probeDomain("example.com");
    assert.strictEqual(result.reachable, false);
    assert.strictEqual(result.httpStatus, null);
    assert.strictEqual(result.error, "HTTP request timed out after 10s");
    mock.restoreAll();
  });

  test("IPv4 private address (RFC1918) is rejected", async () => {
    mock.method(dns, "resolve4", () => Promise.resolve(["10.0.0.1"]));
    mock.method(dns, "resolve6", rejectWith("ENODATA"));
    const fetchMock = mock.method(global, "fetch", async () => ({ status: 200 } as Response));

    const result = await probeDomain("evil.example");

    assert.strictEqual(fetchMock.mock.callCount(), 0);
    assert.strictEqual(result.reachable, false);
    assert.strictEqual(result.dnsResolved, false);
    assert.strictEqual(result.error, "Domain resolves to a private address");
    mock.restoreAll();
  });

  test("IPv4 cloud metadata address is rejected", async () => {
    mock.method(dns, "resolve4", () => Promise.resolve(["169.254.169.254"]));
    mock.method(dns, "resolve6", rejectWith("ENODATA"));
    const fetchMock = mock.method(global, "fetch", async () => ({ status: 200 } as Response));

    const result = await probeDomain("evil.example");

    assert.strictEqual(fetchMock.mock.callCount(), 0);
    assert.strictEqual(result.error, "Domain resolves to a private address");
    mock.restoreAll();
  });

  test("IPv6 loopback is rejected", async () => {
    mock.method(dns, "resolve4", rejectWith("ENODATA"));
    mock.method(dns, "resolve6", () => Promise.resolve(["::1"]));
    const fetchMock = mock.method(global, "fetch", async () => ({ status: 200 } as Response));

    const result = await probeDomain("evil.example");

    assert.strictEqual(fetchMock.mock.callCount(), 0);
    assert.strictEqual(result.error, "Domain resolves to a private address");
    mock.restoreAll();
  });

  test("IPv6 link-local is rejected", async () => {
    mock.method(dns, "resolve4", rejectWith("ENODATA"));
    mock.method(dns, "resolve6", () => Promise.resolve(["fe80::1"]));
    const fetchMock = mock.method(global, "fetch", async () => ({ status: 200 } as Response));

    const result = await probeDomain("evil.example");

    assert.strictEqual(fetchMock.mock.callCount(), 0);
    assert.strictEqual(result.error, "Domain resolves to a private address");
    mock.restoreAll();
  });

  test("IPv4-mapped IPv6 private address is rejected", async () => {
    mock.method(dns, "resolve4", rejectWith("ENODATA"));
    mock.method(dns, "resolve6", () => Promise.resolve(["::ffff:127.0.0.1"]));
    const fetchMock = mock.method(global, "fetch", async () => ({ status: 200 } as Response));

    const result = await probeDomain("evil.example");

    assert.strictEqual(fetchMock.mock.callCount(), 0);
    assert.strictEqual(result.error, "Domain resolves to a private address");
    mock.restoreAll();
  });

  test("mixed v4 (public) + v6 (private) is rejected — any private blocks", async () => {
    mock.method(dns, "resolve4", () => Promise.resolve(["1.2.3.4"]));
    mock.method(dns, "resolve6", () => Promise.resolve(["::1"]));
    const fetchMock = mock.method(global, "fetch", async () => ({ status: 200 } as Response));

    const result = await probeDomain("evil.example");

    assert.strictEqual(fetchMock.mock.callCount(), 0);
    assert.strictEqual(result.error, "Domain resolves to a private address");
    mock.restoreAll();
  });
});
