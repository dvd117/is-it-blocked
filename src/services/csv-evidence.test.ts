import test from "node:test";
import assert from "node:assert/strict";
import { parseCsv, lookupDomain } from "./csv-evidence.ts";
import { ISP_NAMES } from "../domain/types.ts";

const HEADER = "site,domain,category,CANTV,Movistar,Digitel,Inter,Netuno,Airtek,G-Network,Thundernet";

test("an ISP marked unblocked is not counted as restricted", () => {
  const [row] = parseCsv(`${HEADER}\nEFE,efe.com,NEWS,unblocked,unblocked,DNS,ok,ND,ok,ok,ND`);

  assert.deepEqual(row.blockedOnIsps, ["Digitel"]);
  assert.deepEqual(row.blockingMethods, ["DNS"]);
});

test("ND is absence of measurement, not a restriction", () => {
  const [row] = parseCsv(`${HEADER}\nSite,nd.example,NEWS,ND,ND,ND,ND,ND,ND,ND,ND`);

  assert.deepEqual(row.blockedOnIsps, []);
  assert.deepEqual(row.blockingMethods, []);
});

test("columns are matched by header name, not position", () => {
  const shuffled = "site,domain,category,Thundernet,G-Network,Airtek,Netuno,Inter,Digitel,Movistar,CANTV";
  const [row] = parseCsv(`${shuffled}\nSite,shuffled.example,NEWS,ND,ok,ok,ok,ok,ok,ok,DNS`);

  assert.deepEqual(row.blockedOnIsps, ["CANTV"]);
  assert.equal(row.ispResults.Thundernet, "ND");
});

test("an ISP column the app does not know about is ignored, the rest still parse", () => {
  const withExtra = `${HEADER},Newcomer`;
  const [row] = parseCsv(`${withExtra}\nSite,extra.example,NEWS,DNS,ok,ok,ok,ok,ok,ok,ND,DNS`);

  assert.deepEqual(row.blockedOnIsps, ["CANTV"]);
});

test("an ISP column the app knows but the file omits reads as no data, not as ok", () => {
  const missing = "site,domain,category,CANTV,Movistar,Digitel,Inter,Netuno,Airtek,G-Network";
  const [row] = parseCsv(`${missing}\nSite,missing.example,NEWS,ok,ok,ok,ok,ok,ok,ok`);

  assert.equal(row.ispResults.Thundernet, "");
  assert.deepEqual(row.blockedOnIsps, []);
});

test("the shipped dataset parses with Thundernet present and no phantom blocks", () => {
  const efe = lookupDomain("efe.com");
  assert.ok(efe, "efe.com should be in the dataset");
  assert.ok(ISP_NAMES.includes("Thundernet" as never));
  assert.equal(efe.ispResults.Thundernet !== undefined, true);
  assert.equal(efe.blockingMethods.includes("unblocked"), false);
  assert.equal(efe.blockingMethods.includes("ND"), false);
});
