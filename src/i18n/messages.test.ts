import test from "node:test";
import assert from "node:assert/strict";
import messages, { type Lang } from "./messages.ts";
import { applyLanguageToDocument, interpolateMessage } from "./context.tsx";

const langs: Lang[] = ["es", "en"];

const expectedKeys = [
  "site.title",
  "site.htmlTitle",
  "site.subtitle",
  "intro.title",
  "intro.headline",
  "intro.body",
  "intro.note",
  "signals.label",
  "signals.prefix",
  "signals.csv",
  "signals.ooni",
  "signals.server",
  "signals.browser",
  "examples.label",
  "examples.prefix",
  "search.placeholder",
  "search.button",
  "search.loading",
  "phase.server",
  "phase.browser",
  "phase.done",
  "card.browser.title",
  "card.browser.waiting",
  "card.browser.reachable",
  "card.browser.failed",
  "card.browser.timeout",
  "card.browser.inconclusive",
  "card.browser.comparisonConsent",
  "card.browser.comparisonButton",
  "card.browser.comparisonLoading",
  "card.browser.comparisonTargets",
  "card.browser.comparisonTargetsOthers",
  "card.browser.comparisonUnavailable",
  "card.browser.comparisonFailed",
  "card.browser.comparisonOk",
  "card.browser.comparisonResult.reachable",
  "card.browser.comparisonResult.failed",
  "card.browser.comparisonResult.timeout",
  "card.browser.comparisonResult.inconclusive",
  "card.server.title",
  "card.server.waiting",
  "card.server.reachable",
  "card.server.unreachable",
  "card.server.dnsResolved",
  "card.server.dnsButFailed",
  "card.csv.title",
  "card.csv.noData",
  "card.csv.found",
  "card.csv.ispHeader",
  "card.csv.statusHeader",
  "card.csv.restrictedCount",
  "card.csv.source",
  "card.ooni.title",
  "card.ooni.noData",
  "card.ooni.anomalies",
  "card.ooni.confirmed",
  "card.ooni.anomalyLabel",
  "card.ooni.totalLabel",
  "card.ooni.confirmedLabel",
  "card.ooni.lastTested",
  "card.assessment.title",
  "card.assessment.waiting",
  "card.assessment.confidence",
  "card.assessment.signals",
  "verdict.very_likely_isp_blocking",
  "verdict.likely_isp_blocking",
  "verdict.site_may_be_down",
  "verdict.inconclusive",
  "verdict.likely_not_blocked",
  "confidence.high",
  "confidence.medium",
  "confidence.low",
  "diagnosis.warning.vpnDns",
  "nerd.toggle",
  "nerd.copy",
  "nerd.copied",
  "nerd.desc.0",
  "nerd.desc.1",
  "nerd.desc.2",
  "nerd.desc.3",
  "nerd.desc.4",
  "report.toggle",
  "report.ispLabel",
  "report.ispPlaceholder",
  "report.notesLabel",
  "report.notesPlaceholder",
  "report.consent",
  "report.error",
  "report.submitting",
  "report.submit",
  "report.thanks",
  "footer.disclaimer",
  "theme.light",
  "theme.dark",
  "lang.toggle",
];

test("messages provide every UI key for Spanish and English", () => {
  for (const lang of langs) {
    assert.deepStrictEqual(Object.keys(messages[lang]).sort(), expectedKeys.sort());
  }
});

test("language toggle points to the opposite language", () => {
  assert.equal(messages.es["lang.toggle"], "EN");
  assert.equal(messages.en["lang.toggle"], "ES");
});

test("HTML title is localized separately from the visible site title", () => {
  assert.equal(messages.es["site.htmlTitle"], "¿Está Bloqueado?");
  assert.equal(messages.en["site.htmlTitle"], "Is It Blocked?");
});

test("interpolateMessage replaces named placeholders", () => {
  assert.equal(
    interpolateMessage("{failed} of {total} sites could not be reached", {
      failed: 2,
      total: 7,
    }),
    "2 of 7 sites could not be reached",
  );
});

test("applyLanguageToDocument syncs the html lang and document title", () => {
  const documentLike = {
    documentElement: { lang: "" },
    title: "",
  };

  applyLanguageToDocument(documentLike, "es");
  assert.equal(documentLike.documentElement.lang, "es");
  assert.equal(documentLike.title, "¿Está Bloqueado?");

  applyLanguageToDocument(documentLike, "en");
  assert.equal(documentLike.documentElement.lang, "en");
  assert.equal(documentLike.title, "Is It Blocked?");
});

test("Spanish copy uses Venezuelan Spanish, not Rioplatense voseo", () => {
  const copy = Object.values(messages.es).join(" ");

  assert.doesNotMatch(copy, /\b(ingresá|comparalo|buscá|seleccioná|probá|considerá)\b/i);
});

test("VE Sin Filtro source is documented in UI copy", () => {
  assert.equal(messages.es["card.csv.source"].includes("bloqueos.vesinfiltro.org"), true);
  assert.equal(messages.en["card.csv.source"].includes("bloqueos.vesinfiltro.org"), true);
});
