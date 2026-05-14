import test from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { LanguageProvider } from "@/i18n/context";
import { BrowserCard } from "./evidence-cards.tsx";

test("browser comparison result labels are localized in Spanish", () => {
  const markup = renderToStaticMarkup(
    <LanguageProvider>
      <BrowserCard
        signal="reachable_signal"
        domain="example.com"
        comparisonTargets={[]}
        comparisonResults={[
          { domain: "blocked.example", signal: "failed_signal" },
          { domain: "reachable.example", signal: "reachable_signal" },
        ]}
        comparisonTotal={2}
        comparisonFailed={1}
        loading={false}
        comparisonLoading={false}
        canRunComparison={false}
        onRunComparison={() => {}}
      />
    </LanguageProvider>,
  );

  assert.match(markup, /blocked\.example: restringido/);
  assert.match(markup, /reachable\.example: alcanzable/);
  assert.doesNotMatch(markup, /failed_signal|reachable_signal/);
});
