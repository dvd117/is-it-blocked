import test from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { LanguageProvider } from "@/i18n/context";
import { ThemeProvider } from "@/theme/context";
import { SiteHeader } from "./site-header.tsx";

test("site header uses the SVG logo instead of the text marker", () => {
  const markup = renderToStaticMarkup(
    <LanguageProvider>
      <ThemeProvider>
        <SiteHeader />
      </ThemeProvider>
    </LanguageProvider>,
  );

  assert.match(markup, /src="\/logo\.svg"/);
  assert.doesNotMatch(markup, /site-title-marker/);
  assert.doesNotMatch(markup, /◉/);
});
