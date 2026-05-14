import test from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { LanguageProvider } from "@/i18n/context";
import { PhaseIndicator } from "./phase-indicator.tsx";

test("phase indicator renders localized steps and fades when done", () => {
  const markup = renderToStaticMarkup(
    <LanguageProvider>
      <PhaseIndicator phase="done" />
    </LanguageProvider>,
  );

  assert.match(markup, /phase-indicator--done/);
  assert.match(markup, /Servidor/);
  assert.match(markup, /Navegador/);
  assert.match(markup, /Completado/);
  assert.match(markup, /✓/);
});
