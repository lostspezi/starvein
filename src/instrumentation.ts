/**
 * Next.js-Instrumentation: läuft einmal beim Server-Start. Wir validieren
 * hier die server-seitige Env (fehlende/schwache Secrets → sofortiger
 * Abbruch in Produktion statt späterem Laufzeitfehler). Nur auf der
 * Node-Runtime, nicht im Edge-/Browser-Kontext.
 */
export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { assertServerEnv } = await import("./lib/env");
    assertServerEnv();
  }
}
