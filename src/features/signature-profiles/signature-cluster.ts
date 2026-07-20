import type { RarityTier } from "@/features/ores/ores.schema";

/**
 * Cluster-Signaturen: Der In-Game-Scanner zeigt die SUMME eines Clusters,
 * also Basis-RS × Anzahl der Rocks/Deposits (CLAUDE.md §5/§6.2). Diese reine
 * Funktion leitet aus dem Basiswert (oder -bereich) die ×N-Summen ab —
 * genutzt vom Signatur-Panel, dem Erz-Detail-Hinweis und dem Cluster-Chart.
 */
export const CLUSTER_COUNTS = [1, 2, 3, 4] as const;

/**
 * Wie viele Cluster-Stufen eine Zeile im Chart zeigt, gestaffelt nach
 * Seltenheit: seltene Minerale bilden kleinere Cluster (weniger Rocks),
 * häufige größere. Entspricht der Farbstaffelung der Referenz-Ansicht.
 */
export const CLUSTER_DEPTH_BY_RARITY: Record<RarityTier, number> = {
  legendary: 2,
  epic: 3,
  rare: 4,
  uncommon: 5,
  common: 6,
};

export function clusterDepthForRarity(tier: RarityTier): number {
  return CLUSTER_DEPTH_BY_RARITY[tier];
}

export type SignatureInput = {
  signatureValue?: number;
  signatureRange?: { min: number; max: number };
};

export type SignatureCluster = {
  /** Anzahl der Rocks/Deposits im Cluster (1..maxCount). */
  count: number;
  /** Gesetzt bei bekanntem Einzelwert (Ship identifiziert das Mineral). */
  value?: number;
  /** Gesetzt bei Signatur-Bereich (min/max je × count). */
  range?: { min: number; max: number };
};

/**
 * Leitet die Cluster-Summen ab. `maxCount` steuert die Tiefe (Default 4, damit
 * bestehende Aufrufer unverändert bleiben); der Chart übergibt eine nach
 * Seltenheit gestaffelte Tiefe.
 */
export function signatureClusters(
  sig: SignatureInput,
  maxCount: number = CLUSTER_COUNTS.length,
): SignatureCluster[] {
  const counts = Array.from({ length: maxCount }, (_, index) => index + 1);

  if (sig.signatureValue !== undefined) {
    const base = sig.signatureValue;
    return counts.map((count) => ({ count, value: base * count }));
  }
  if (sig.signatureRange) {
    const { min, max } = sig.signatureRange;
    return counts.map((count) => ({
      count,
      range: { min: min * count, max: max * count },
    }));
  }
  return [];
}
