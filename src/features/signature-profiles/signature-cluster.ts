/**
 * Cluster-Signaturen: Der In-Game-Scanner zeigt die SUMME eines Clusters,
 * also Basis-RS × Anzahl der Rocks/Deposits (CLAUDE.md §5/§6.2). Diese reine
 * Funktion leitet aus dem Basiswert (oder -bereich) die 1×–4×-Summen ab —
 * genutzt vom Signatur-Panel und dem Erz-Detail-Hinweis.
 */
export const CLUSTER_COUNTS = [1, 2, 3, 4] as const;

export type SignatureInput = {
  signatureValue?: number;
  signatureRange?: { min: number; max: number };
};

export type SignatureCluster = {
  /** Anzahl der Rocks/Deposits im Cluster (1–4). */
  count: number;
  /** Gesetzt bei bekanntem Einzelwert (Ship identifiziert das Mineral). */
  value?: number;
  /** Gesetzt bei Signatur-Bereich (min/max je × count). */
  range?: { min: number; max: number };
};

export function signatureClusters(sig: SignatureInput): SignatureCluster[] {
  if (sig.signatureValue !== undefined) {
    const base = sig.signatureValue;
    return CLUSTER_COUNTS.map((count) => ({ count, value: base * count }));
  }
  if (sig.signatureRange) {
    const { min, max } = sig.signatureRange;
    return CLUSTER_COUNTS.map((count) => ({
      count,
      range: { min: min * count, max: max * count },
    }));
  }
  return [];
}
