import test from "node:test";
import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import { GET } from "./route.ts";

test("/api/known-tests rejects invalid domains consistently", async () => {
  const response = await GET(new NextRequest("http://localhost/api/known-tests?domain=hello"));

  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), { error: "Invalid URL or domain" });
});
