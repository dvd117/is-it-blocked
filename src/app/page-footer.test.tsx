import test from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import HomePage from "./page.tsx";
import Providers from "./providers.tsx";

test("footer shows the app version on the initial page", () => {
  const markup = renderToStaticMarkup(
    <Providers>
      <HomePage />
    </Providers>,
  );

  assert.match(markup, /footer-disclaimer/);
  assert.match(markup, /v0\.2\.0/);
});
