"use client";

import Script from "next/script";

/**
 * Scalar-Konfiguration: dunkles Theme passend zur Seite, keine externen
 * Fonts (strikte CSP erlaubt nur 'self') — Scalar fällt dann auf die
 * System-Fontstack zurück.
 */
const SCALAR_CONFIGURATION = JSON.stringify({
  darkMode: true,
  hideDarkModeToggle: true,
  withDefaultFonts: false,
});

/**
 * Interaktive OpenAPI-Referenz. Das Standalone-Bundle (~3,6 MB) liegt
 * selbst-gehostet unter /public/vendor (scripts/vendor-scalar.ts) und
 * lädt per lazyOnload nur auf dieser Seite — nie von einem CDN.
 */
export function ScalarReference() {
  return (
    <section aria-label="API reference">
      <script
        id="api-reference"
        data-url="/api/v1/openapi.json"
        data-configuration={SCALAR_CONFIGURATION}
      />
      <Script src="/vendor/scalar/standalone.js" strategy="lazyOnload" />
    </section>
  );
}
