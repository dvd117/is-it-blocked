import test, { mock } from "node:test";
import assert from "node:assert/strict";
import fs from "fs";
import { POST } from "./route.ts";

const baseReport = {
  domain: "example.com",
  isp: "CANTV",
  browserResult: "reachable_signal",
  diagnosis: "likely_not_blocked",
  manualNotes: "",
  consent: true,
  createdAt: "2026-09-21T00:00:00.000Z",
};

test("report API rejects unbounded fields before writing them", async () => {
  const invalidReports: Array<[string, Record<string, unknown>]> = [
    ["browserResult", { browserResult: "x".repeat(10_000) }],
    ["diagnosis", { diagnosis: "x".repeat(10_000) }],
    ["manualNotes", { manualNotes: { unexpected: "x".repeat(10_000) } }],
    ["createdAt", { createdAt: "x".repeat(10_000) }],
  ];
  const appendFileMock = mock.method(fs, "appendFileSync", () => undefined);

  try {
    for (const [index, [field, override]] of invalidReports.entries()) {
      const response = await POST(new Request("http://localhost/api/report", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "true-client-ip": `192.0.2.${index + 1}`,
        },
        body: JSON.stringify({ ...baseReport, ...override }),
      }));

      assert.equal(response.status, 400, `${field} should be rejected`);
    }
  } finally {
    mock.restoreAll();
  }

  assert.equal(appendFileMock.mock.callCount(), 0);
});
