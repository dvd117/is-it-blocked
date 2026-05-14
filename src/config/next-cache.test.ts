import assert from "node:assert/strict";
import test from "node:test";
import nextConfig from "../../next.config";

test("root page disables shared cache so deployments show fresh UI", async () => {
  assert.equal(typeof nextConfig.headers, "function");

  const headers = await nextConfig.headers();
  const rootHeaders = headers.find((entry) => entry.source === "/");
  const cacheControl = rootHeaders?.headers.find(
    (header) => header.key.toLowerCase() === "cache-control",
  )?.value;

  assert.match(cacheControl ?? "", /no-store/);
});


test("root page opts out of static prerendering", async () => {
  const page = await import("../app/page.tsx");

  assert.equal(page.dynamic, "force-dynamic");
  assert.equal(page.revalidate, 0);
});
