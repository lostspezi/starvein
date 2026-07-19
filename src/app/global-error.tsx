"use client";

/**
 * Letzter Auffang-Error-Boundary: ersetzt das Root-Layout bei Fehlern, die
 * sonst ungefangen durchschlagen würden. Zeigt bewusst nur eine generische
 * Meldung ohne interne Details/Stacktraces (Next.js maskiert Server-Fehler in
 * Produktion bereits; dies ergänzt einen sauberen, markenkonformen Fallback).
 * Die `digest`-Referenz ist ein Hash ohne sensiblen Inhalt und hilft beim
 * Zuordnen von Server-Logs.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#0a0e1a",
          color: "#e8eaf5",
          fontFamily:
            "system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif",
        }}
      >
        <main
          style={{ maxWidth: "32rem", padding: "2rem", textAlign: "center" }}
        >
          <h1 style={{ fontSize: "1.5rem", marginBottom: "0.5rem" }}>
            Something went wrong / Ein Fehler ist aufgetreten
          </h1>
          <p style={{ color: "#8b95b0", marginBottom: "1.5rem" }}>
            An unexpected error occurred. Please try again. / Ein unerwarteter
            Fehler ist aufgetreten. Bitte erneut versuchen.
          </p>
          <button
            type="button"
            onClick={() => reset()}
            style={{
              padding: "0.5rem 1.25rem",
              borderRadius: "0.5rem",
              border: "1px solid #5ee6ff24",
              background: "#7c6cf0",
              color: "#fff",
              cursor: "pointer",
              fontSize: "1rem",
            }}
          >
            Reload
          </button>
          {error.digest ? (
            <p
              style={{
                color: "#8b95b0",
                marginTop: "1.5rem",
                fontSize: "0.75rem",
              }}
            >
              Ref: {error.digest}
            </p>
          ) : null}
        </main>
      </body>
    </html>
  );
}
