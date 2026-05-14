import test from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { LanguageProvider } from "@/i18n/context";
import { SearchForm } from "./search-form.tsx";

test("search form exposes demo examples and the four evidence signals", () => {
  const markup = renderToStaticMarkup(
    <LanguageProvider>
      <SearchForm
        query=""
        loading={false}
        onQueryChange={() => {}}
        onSubmit={() => {}}
      />
    </LanguageProvider>,
  );

  assert.match(markup, /x\.com/);
  assert.match(markup, /signal\.org/);
  assert.match(markup, /runrun\.es/);
  assert.match(markup, /VE Sin Filtro/);
  assert.match(markup, /OONI/);
  assert.match(markup, /Servidor/);
  assert.match(markup, /Tu red/);
});
