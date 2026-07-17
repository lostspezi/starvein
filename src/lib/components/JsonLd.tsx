/**
 * Rendert ein schema.org-Objekt als JSON-LD-Script. "<" wird als
 * Unicode-Escape (backslash-u003c) serialisiert, damit String-Inhalte
 * (z. B. Guide-Titel) nicht per schließendem script-Tag ausbrechen können —
 * in JSON gleichwertig und für Parser transparent.
 */
export function JsonLd({ data }: { data: object }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(data).replace(/</g, "\\u003c"),
      }}
    />
  );
}
