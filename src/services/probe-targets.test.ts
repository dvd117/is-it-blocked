import test from "node:test";
import assert from "node:assert/strict";
import { lookupDomain, getAllDomains } from "./csv-evidence.ts";
import { getComparisonTargets } from "./probe-targets.ts";

const SERVICE_SUBDOMAIN = /^(api|abs|pbs|upload|video|mobile|m)\..*\./;

test("comparison targets never include API or media service hosts", () => {
  const evidence = lookupDomain("abs.twimg.com");
  const targets = getComparisonTargets("abs.twimg.com", evidence?.category).map((t) => t.domain);

  assert.ok(targets.length > 0, "expected some comparison targets");
  assert.equal(targets.some((domain) => SERVICE_SUBDOMAIN.test(domain)), false);
  assert.equal(targets.includes("abs.twimg.com"), false);
});

test("a registrable domain that merely starts with a service word stays eligible", () => {
  // pbs.org is the US broadcaster, not a twimg media host. The prefix filter
  // must key on the subdomain boundary, not on the leading label alone.
  const pbs = getAllDomains().find((e) => e.domain === "pbs.org");
  assert.ok(pbs, "pbs.org should be in the dataset");
  assert.ok(pbs.blockedOnIsps.length >= 4, "fixture assumes pbs.org is broadly restricted");

  const targets = getComparisonTargets("efe.com", "NEWS").map((t) => t.domain);
  assert.ok(targets.includes("pbs.org"), `pbs.org was filtered out: ${targets.join(", ")}`);
});

test("anonymous comparison targets avoid known redirect-localized domains", () => {
  const evidence = lookupDomain("ipvanish.com");
  const targets = getComparisonTargets("ipvanish.com", evidence?.category).map((t) => t.domain);

  assert.ok(targets.length > 0);
  assert.equal(targets.includes("mullvad.net"), false);
});

test("comparison targets exclude domains with no documented restriction", () => {
  const targets = getComparisonTargets("efe.com", "NEWS");

  assert.ok(targets.length > 0);
  for (const target of targets) {
    assert.ok(target.blockedIspCount >= 4, `${target.domain} has only ${target.blockedIspCount} ISPs`);
  }
});
