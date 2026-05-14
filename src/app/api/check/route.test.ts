import test, { mock } from "node:test";
import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import { GET } from "./route.ts";

test("/api/check rejects invalid input before downstream probes", async () => {
  const fetchMock = mock.method(global, "fetch", async () => {
    throw new Error("fetch should not run for invalid input");
  });

  const response = await GET(new NextRequest("http://localhost/api/check?url=hello"));

  assert.equal(response.status, 400);
  assert.equal(fetchMock.mock.callCount(), 0);
  assert.deepEqual(await response.json(), { error: "Invalid URL or domain" });

  mock.restoreAll();
});
