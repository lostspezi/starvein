/**
 * Pure Spam-Heuristiken für den Community-Chat. Treffer führen zur
 * Ablehnung der Nachricht (422 mit Fehlercode), nicht zur Normalisierung.
 */

const PROTOCOL_LINK = /https?:\/\//i;
const WWW_LINK = /(?:^|[^\p{L}\p{N}])www\./iu;
// Bare Domains nur über eine kurze TLD-Liste erkennen — Versionsnummern
// ("4.2.0") und deutsche Abkürzungen ("z.B.", "d.h.") dürfen nicht matchen.
const BARE_DOMAIN = /\b[\w-]+\.(?:com|net|org|de|io|gg|tv|me|co|xyz)\b/i;

export function containsLink(text: string): boolean {
  return (
    PROTOCOL_LINK.test(text) || WWW_LINK.test(text) || BARE_DOMAIN.test(text)
  );
}

// Erst ab 16 Buchstaben werten, damit kurze Ausrufe ("WTF") und
// Erzcode-Aufzählungen ("QUAN BEXA HADA") nicht als Schreien gelten.
const CAPS_MIN_LETTERS = 16;
const CAPS_MAX_RATIO = 0.7;

export function hasExcessiveCaps(text: string): boolean {
  const letters = text.match(/\p{L}/gu) ?? [];
  if (letters.length < CAPS_MIN_LETTERS) return false;
  const uppercase = text.match(/\p{Lu}/gu) ?? [];
  return uppercase.length / letters.length > CAPS_MAX_RATIO;
}

const REPEATED_RUN = /(.)\1{7,}/u;

export function hasRepeatedRun(text: string): boolean {
  return REPEATED_RUN.test(text);
}

/** Normalform für die Duplikat-Erkennung: Groß-/Kleinschreibung,
 *  Interpunktion und Whitespace-Varianten zählen nicht als Unterschied. */
export function normalizeForDuplicate(text: string): string {
  return text.toLowerCase().replace(/\p{P}/gu, "").replace(/\s+/g, " ").trim();
}
