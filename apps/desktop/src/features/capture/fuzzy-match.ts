export type MatchCandidate = {
  key: string;
  aliases: string[];
};

export function levenshtein(a: string, b: string): number {
  const rows = a.length + 1;
  const cols = b.length + 1;
  const distance = new Array<number>(cols).fill(0).map((_, i) => i);

  for (let row = 1; row < rows; row += 1) {
    let previousDiagonal = distance[0];
    distance[0] = row;
    for (let col = 1; col < cols; col += 1) {
      const substitutionCost = a[row - 1] === b[col - 1] ? 0 : 1;
      const next = Math.min(
        distance[col] + 1, // Löschung
        distance[col - 1] + 1, // Einfügung
        previousDiagonal + substitutionCost,
      );
      previousDiagonal = distance[col];
      distance[col] = next;
    }
  }
  return distance[cols - 1];
}

function normalize(value: string): string {
  return value.toUpperCase().replace(/[^A-ZÄÖÜ]/g, "");
}

/** Relative Distanz, ab der ein Kandidat als Treffer gilt (OCR-Verleser). */
const MAX_RELATIVE_DISTANCE = 0.34;

/**
 * Bester Fuzzy-Treffer eines OCR-Strings gegen Katalog-Kandidaten
 * (Erze: name_en/name_de/code, Methoden: Name). Null, wenn nichts nah
 * genug ist — dann zeigt das Formular die Zeile als "nicht zugeordnet".
 */
export function fuzzyBestMatch(
  raw: string,
  candidates: MatchCandidate[],
): { key: string; score: number } | null {
  const needle = normalize(raw);
  if (needle.length < 3) {
    return null;
  }

  let best: { key: string; score: number } | null = null;
  for (const candidate of candidates) {
    for (const alias of candidate.aliases) {
      const target = normalize(alias);
      if (target.length === 0) {
        continue;
      }
      const score =
        levenshtein(needle, target) / Math.max(needle.length, target.length);
      if (score <= MAX_RELATIVE_DISTANCE && (!best || score < best.score)) {
        best = { key: candidate.key, score };
      }
    }
  }
  return best;
}
