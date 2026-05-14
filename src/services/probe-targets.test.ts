import test from "node:test";
import assert from "node:assert/strict";
import { lookupDomain } from "./csv-evidence.ts";
import { getComparisonTargets } from "./probe-targets.ts";

const SERVICE_SUBDOMAIN = /^(api|abs|pbs|upload|video|mobile|m)\./;

test("comparison targets for X prioritize user-facing domains over API and media hosts", () => {
  const evidence = lookupDomain("api.twitter.com");
  const targets = getComparisonTargets("api.twitter.com", evidence?.category).map((target) => target.domain);

  assert.deepEqual(targets.slice(0, 2), ["x.com", "twitter.com"]);
  assert.equal(targets.some((domain) => SERVICE_SUBDOMAIN.test(domain)), false);
});

test("anonymous comparison targets avoid known redirect-localized domains", () => {
  const evidence = lookupDomain("ipvanish.com");
  const targets = getComparisonTargets("ipvanish.com", evidence?.category).map((target) => target.domain);

  assert.equal(targets.includes("mullvad.net"), false);
});
