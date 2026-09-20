import { describe, test, before, after, mock } from "node:test";
import assert from "node:assert";
import { rateLimit, clientKey } from "./rate-limit.ts";

// Unique key generator — avoids shared bucket state between tests
let seq = 0;
const key = () => `test-${++seq}`;

describe("rateLimit", () => {
  let t = 1_000_000;

  before(() => {
    mock.timers.enable({ apis: ["Date"] });
    mock.timers.setTime(t);
  });

  after(() => mock.timers.reset());

  test("allows requests up to capacity", () => {
    const k = key();
    for (let i = 0; i < 5; i++) assert.strictEqual(rateLimit(k, 5, 0), true);
  });

  test("rejects when bucket is empty", () => {
    const k = key();
    for (let i = 0; i < 3; i++) rateLimit(k, 3, 0);
    assert.strictEqual(rateLimit(k, 3, 0), false);
  });

  test("tracks keys independently", () => {
    const [k1, k2] = [key(), key()];
    for (let i = 0; i < 3; i++) rateLimit(k1, 3, 0);
    assert.strictEqual(rateLimit(k2, 3, 0), true);
  });

  test("refills tokens over time", () => {
    const k = key();
    rateLimit(k, 1, 1);
    assert.strictEqual(rateLimit(k, 1, 1), false);
    t += 1100;
    mock.timers.setTime(t);
    assert.strictEqual(rateLimit(k, 1, 1), true);
  });

  test("does not refill beyond capacity", () => {
    const k = key();
    t += 10_000;
    mock.timers.setTime(t);
    let allowed = 0;
    for (let i = 0; i < 10; i++) if (rateLimit(k, 3, 1)) allowed++;
    assert.strictEqual(allowed, 3);
  });
});

describe("clientKey", () => {
  function req(headers: Record<string, string>) {
    return new Request("https://example.com", { headers });
  }

  test("prefers the edge-set true-client-ip", () => {
    assert.strictEqual(clientKey(req({ "true-client-ip": "9.9.9.9" })), "9.9.9.9");
  });

  test("accepts x-deflect-client-ip as the equivalent edge header", () => {
    assert.strictEqual(clientKey(req({ "x-deflect-client-ip": "9.9.9.9" })), "9.9.9.9");
  });

  test("an edge header wins over a client-supplied x-forwarded-for", () => {
    assert.strictEqual(
      clientKey(req({ "x-forwarded-for": "1.1.1.1", "true-client-ip": "9.9.9.9" })),
      "9.9.9.9"
    );
  });

  test("falls back to the last x-forwarded-for entry, which the proxy appends", () => {
    // A client can prepend entries; only the rightmost one was written by a
    // hop we control, so the leftmost value must never be trusted.
    assert.strictEqual(clientKey(req({ "x-forwarded-for": "1.2.3.4, 5.6.7.8" })), "5.6.7.8");
  });

  test("never reads x-real-ip, which carries the Deflect edge address", () => {
    assert.strictEqual(clientKey(req({ "x-real-ip": "9.9.9.9" })), "anonymous");
  });

  test("ignores a malformed edge header instead of bucketing on it", () => {
    assert.strictEqual(clientKey(req({ "true-client-ip": "not-an-ip" })), "anonymous");
  });

  test("returns anonymous when no IP header present", () => {
    assert.strictEqual(clientKey(req({})), "anonymous");
  });
});
