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

test("site header shows icon-only project links below the controls", () => {
  const markup = renderToStaticMarkup(
    <LanguageProvider>
      <ThemeProvider>
        <SiteHeader />
      </ThemeProvider>
    </LanguageProvider>,
  );

  assert.match(markup, /class="header-actions"/);
  assert.match(markup, /class="header-controls"/);
  assert.match(markup, /class="header-links"/);
  assert.ok(markup.indexOf('class="header-controls"') < markup.indexOf('class="header-links"'));
  assert.match(markup, /aria-label="GitHub repository"/);
  assert.match(markup, /href="https:\/\/github\.com\/dvd117\/is-it-blocked"/);
  assert.match(markup, /aria-label="LinkedIn profile"/);
  assert.match(markup, /href="https:\/\/www\.linkedin\.com\/in\/davidaragort\/"/);
});
