import test from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import HomePage from "./page.tsx";
import Providers from "./providers.tsx";
import { APP_VERSION } from "@/config/app-version";

test("footer shows the app version on the initial page", () => {
  const markup = renderToStaticMarkup(
    <Providers>
      <HomePage />
    </Providers>,
  );

  assert.match(markup, /footer-disclaimer/);
  assert.ok(markup.includes(`v${APP_VERSION}`));
});
