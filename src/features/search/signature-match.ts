/**
 * Reines Matching gescannter RS-Werte gegen die Signatur-Referenz (kein I/O).
 *
 * Der In-Game-Scanner zeigt die Summe eines Clusters: Basis-Signatur ×
 * Anzahl der Rocks/Deposits (z. B. 18.000 = 5 × Bexalite 3.600). Die Suche
 * akzeptiert numerische Queries und rechnet auf mögliche Mineral+Anzahl-
 * Kombinationen zurück — als Näherungssuche mit ±10% Toleranz (wie Rock
 * Syndicate), damit auch grobe Werte wie "3000" die Minerale der Umgebung
 * vorschlagen (Quantainium 3170, Stileron 3185, …). Exakte Treffer zuerst,
 * danach aufsteigend nach Abweichung.
 */

export type ShipSignatureEntry = {
  oreCode: string;
  oreName: string;
  signatureValue: number;
};

export type GroundSignatureEntry = {
  method: "roc" | "fps";
  signatureValue: number;
};

export type SignatureQueryMatch =
  | {
      type: "ore";
      count: number;
      signatureValue: number;
      oreCode: string;
      oreName: string;
      /** true = exakter Scanner-Wert, false = Näherungsvorschlag */
      exact: boolean;
    }
  | {
      type: "ground";
      count: number;
      signatureValue: number;
      method: "roc" | "fps";
      exact: boolean;
    };

/** Wie die Community-Tools: mehr als 10 Rocks pro Cluster kommen nicht vor. */
const MAX_CLUSTER_SIZE = 10;

/** Kleinste Basis-Signatur ist 3000 (FPS) — alles darunter ist kein RS-Wert. */
const MIN_SCANNER_VALUE = 1000;

/** Relative Toleranz der Näherungssuche (±10%, wie Rock Syndicate). */
const TOLERANCE = 0.1;

/**
 * Erkennt numerische Queries ("18000", "18.000", "18,000", "6 340").
 * Nicht-numerische oder zu kleine Werte -> null (normale Textsuche).
 */
export function parseSignatureQuery(query: string): number | null {
  const trimmed = query.trim();
  if (!/^[\d.,\s]+$/.test(trimmed)) return null;

  const digits = trimmed.replace(/[.,\s]/g, "");
  if (digits.length === 0) return null;

  const value = Number.parseInt(digits, 10);
  return value >= MIN_SCANNER_VALUE ? value : null;
}

type Candidate = { match: SignatureQueryMatch; deviation: number };

/** Beste Cluster-Größe (kleinste Abweichung) für einen Basis-Wert — oder null. */
function bestCluster(
  value: number,
  base: number,
): { count: number; deviation: number } | null {
  let best: { count: number; deviation: number } | null = null;
  for (let count = 1; count <= MAX_CLUSTER_SIZE; count++) {
    const expected = base * count;
    const deviation = Math.abs(value - expected) / expected;
    if (
      deviation <= TOLERANCE &&
      (best === null || deviation < best.deviation)
    ) {
      best = { count, deviation };
    }
  }
  return best;
}

/**
 * Alle Mineral+Anzahl-Kombinationen, deren Cluster-Summe dem gescannten
 * Wert entspricht (±10%). Sortierung: Abweichung aufsteigend (exakte
 * Treffer zuerst), bei Gleichstand Erz-Treffer vor Ground, dann kleinere
 * Cluster zuerst. Pro Mineral nur die naheliegendste Cluster-Größe.
 *
 * Trifft ein Erz exakt (Basis-Signaturen sind pro Mineral einmalig), sind
 * Näherungsvorschläge nur Rauschen -> dann ausschließlich exakte Treffer.
 * Exakte Ground-Treffer (runde 3000/4000-Vielfache) unterdrücken die
 * Vorschläge dagegen nicht — wer "3000" tippt, meint oft einen ungefähren
 * Ship-Wert.
 */
export function matchSignatureValue(
  value: number,
  ship: ShipSignatureEntry[],
  ground: GroundSignatureEntry[],
): SignatureQueryMatch[] {
  const candidates: Candidate[] = [];

  for (const entry of ship) {
    const best = bestCluster(value, entry.signatureValue);
    if (best) {
      candidates.push({
        deviation: best.deviation,
        match: {
          type: "ore",
          count: best.count,
          signatureValue: entry.signatureValue,
          oreCode: entry.oreCode,
          oreName: entry.oreName,
          exact: best.deviation === 0,
        },
      });
    }
  }

  for (const entry of ground) {
    const best = bestCluster(value, entry.signatureValue);
    if (best) {
      candidates.push({
        deviation: best.deviation,
        match: {
          type: "ground",
          count: best.count,
          signatureValue: entry.signatureValue,
          method: entry.method,
          exact: best.deviation === 0,
        },
      });
    }
  }

  candidates.sort(
    (a, b) =>
      a.deviation - b.deviation ||
      (a.match.type === "ore" ? 0 : 1) - (b.match.type === "ore" ? 0 : 1) ||
      a.match.count - b.match.count,
  );

  const hasExactOreMatch = candidates.some(
    (candidate) => candidate.match.exact && candidate.match.type === "ore",
  );
  const visible = hasExactOreMatch
    ? candidates.filter((candidate) => candidate.match.exact)
    : candidates;

  return visible.map((candidate) => candidate.match);
}
