import test from "node:test";
import assert from "node:assert/strict";
import { diagnose } from "./diagnosis.ts";
import type { CsvEvidence, OoniEvidence, ServerProbeResult } from "./types.ts";

const reachableServer: ServerProbeResult = {
  reachable: true,
  dnsResolved: true,
  resolvedIps: ["1.2.3.4"],
  httpStatus: 200,
  responseTimeMs: 42,
  error: null,
};

const csvEvidence: CsvEvidence = {
  domain: "x.com",
  siteName: "X",
  category: "social_media",
  ispResults: { CANTV: "DNS blocking" },
  blockedOnIsps: ["CANTV"],
  blockingMethods: ["DNS blocking"],
};

const ooniEvidence: OoniEvidence = {
  domain: "x.com",
  totalCount: 4,
  anomalyCount: 3,
  confirmedCount: 1,
  lastTested: "2026-05-13T00:00:00Z",
  recentMeasurements: [],
};

test("diagnose returns Spanish reasoning and signals when requested", () => {
  const diagnosis = diagnose(
    {
      csv: csvEvidence,
      ooni: ooniEvidence,
      serverProbe: reachableServer,
      browserSignal: "failed_signal",
    },
    "es",
  );

  assert.equal(diagnosis.verdict, "very_likely_isp_blocking");
  assert.match(diagnosis.reasoning, /La evidencia coincide/);
  assert.match(diagnosis.signals.join(" "), /VE Sin Filtro/);
  assert.doesNotMatch(diagnosis.reasoning, /The evidence is consistent/);
});

test("diagnose translates CSV restriction methods in Spanish signals", () => {
  const diagnosis = diagnose(
    {
      csv: csvEvidence,
      ooni: null,
      serverProbe: reachableServer,
      browserSignal: "reachable_signal",
    },
    "es",
  );

  assert.match(diagnosis.signals.join(" "), /mediante bloqueo DNS/);
  assert.doesNotMatch(diagnosis.signals.join(" "), /DNS restriction|DNS blocking/);
});

test("diagnose keeps comparison reasoning in Spanish", () => {
  const diagnosis = diagnose(
    {
      csv: null,
      ooni: null,
      serverProbe: reachableServer,
      browserSignal: "failed_signal",
      comparison: {
        totalProbed: 2,
        failedCount: 2,
        targets: [],
      },
    },
    "es",
  );

  assert.match(diagnosis.reasoning, /sitios conocidos como restringidos también fallaron desde esta red/);
  assert.doesNotMatch(diagnosis.reasoning, /known-restricted|from this network|contextual corroboration/);
});

test("diagnose keeps VPN and DNS comparison warning in Spanish", () => {
  const diagnosis = diagnose(
    {
      csv: null,
      ooni: null,
      serverProbe: reachableServer,
      browserSignal: "reachable_signal",
      comparison: {
        totalProbed: 2,
        failedCount: 0,
        targets: [],
      },
    },
    "es",
  );

  assert.match(diagnosis.reasoning, /VPN, DNS alternativo/);
  assert.doesNotMatch(diagnosis.reasoning, /Known-restricted|reachable from your network|alternative DNS/);
});

test("same evidence produces Spanish then English when lang toggles", () => {
  const input = {
    csv: csvEvidence,
    ooni: ooniEvidence,
    serverProbe: reachableServer,
    browserSignal: "failed_signal" as const,
  };

  const es = diagnose(input, "es");
  const en = diagnose(input, "en");

  assert.equal(es.verdict, en.verdict);
  assert.equal(es.confidence, en.confidence);
  assert.match(es.reasoning, /La evidencia coincide/);
  assert.match(en.reasoning, /The evidence is consistent/);
  assert.match(es.signals.join(" "), /bloqueo DNS/);
  assert.match(en.signals.join(" "), /DNS restriction/);
});

test("comparison counts switch language correctly", () => {
  const input = {
    csv: null,
    ooni: null,
    serverProbe: reachableServer,
    browserSignal: "failed_signal" as const,
    comparison: { totalProbed: 3, failedCount: 2, targets: [] },
  };

  const en = diagnose(input, "en");
  const es = diagnose(input, "es");

  assert.match(en.signals.join(" "), /2 of 3 known-restricted/);
  assert.match(es.signals.join(" "), /2 de 3 sitios conocidos/);
  assert.match(en.reasoning, /2 of 3 known-restricted/);
  assert.match(es.reasoning, /2 de 3 sitios conocidos/);
});

test("diagnose keeps English copy by default for API compatibility", () => {
  const diagnosis = diagnose({
    csv: null,
    ooni: null,
    serverProbe: reachableServer,
    browserSignal: "reachable_signal",
  });

  assert.equal(diagnosis.verdict, "likely_not_blocked");
  assert.match(diagnosis.reasoning, /Our server reached this site/);
});
