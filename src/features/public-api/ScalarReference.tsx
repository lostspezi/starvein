"use client";

import Script from "next/script";

declare global {
  interface Window {
    Scalar?: {
      createApiReference: (
        selector: string,
        configuration: Record<string, unknown>,
      ) => void;
    };
  }
}

/**
 * Scalar-Konfiguration: v1-Spec, dunkles Theme passend zur Seite, keine
 * externen Fonts (strikte CSP erlaubt nur 'self' — Scalar fällt auf den
 * System-Fontstack zurück).
 */
export const SCALAR_CONFIGURATION: Record<string, unknown> = {
  url: "/api/v1/openapi.json",
  darkMode: true,
  hideDarkModeToggle: true,
  withDefaultFonts: false,
};

/**
 * Interaktive OpenAPI-Referenz. Das Standalone-Bundle (~3,6 MB) liegt
 * selbst-gehostet unter /public/vendor (scripts/vendor-scalar.ts), lädt
 * per lazyOnload nur auf dieser Seite und mountet über die
 * window.Scalar-API in den Container — kein Script-Marker-Tag, das
 * React clientseitig ohnehin nie ausführen würde.
 */
export function ScalarReference() {
  return (
    <section aria-label="API reference">
      <div id="scalar-reference" />
      <Script
        src="/vendor/scalar/standalone.js"
        strategy="lazyOnload"
        onLoad={() => {
          window.Scalar?.createApiReference(
            "#scalar-reference",
            SCALAR_CONFIGURATION,
          );
        }}
      />
    </section>
  );
}
