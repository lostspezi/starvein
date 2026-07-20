import type { Ore, RarityTier } from "@/features/ores/ores.schema";
import type { SignatureProfile } from "./signature-profiles.schema";
import { clusterDepthForRarity, signatureClusters } from "./signature-cluster";

/** Generische Ground-Tracks: Basis-RS pro Deposit und Cluster-Tiefe. */
export const GROUND_BASE_SIGNATURE: Record<"roc" | "fps", number> = {
  roc: 4000,
  fps: 3000,
};
export const GROUND_CLUSTER_DEPTH = 7;

/** ±10 % Fenster für die ~Wert-Suche. */
export const SCAN_TOLERANCE = 0.1;

export type ChartNode = { count: number; value: number };

export type ShipChartRow = {
  kind: "ship";
  key: string;
  method: "ship";
  oreCode: string;
  oreName: string;
  rarityTier: RarityTier;
  baseValue: number;
  nodes: ChartNode[];
  dominantCompositionRange?: { min: number; max: number };
  notes?: string;
};

export type GroundChartRow = {
  kind: "ground";
  key: string;
  method: "roc" | "fps";
  track: "roc" | "fps";
  /** Farb-Tier für die Rarity-Utility (Ground bewusst neutral/muted). */
  rarityTier: RarityTier;
  baseValue: number;
  nodes: ChartNode[];
};

export type ChartRow = ShipChartRow | GroundChartRow;

function toNodes(baseValue: number, depth: number): ChartNode[] {
  return signatureClusters({ signatureValue: baseValue }, depth).map((c) => ({
    count: c.count,
    value: c.value!,
  }));
}

function groundRow(track: "roc" | "fps"): GroundChartRow {
  const baseValue = GROUND_BASE_SIGNATURE[track];
  return {
    kind: "ground",
    key: `ground-${track}`,
    method: track,
    track,
    rarityTier: "common",
    baseValue,
    nodes: toNodes(baseValue, GROUND_CLUSTER_DEPTH),
  };
}

/**
 * Baut die Chart-Zeilen: alle Ship-Signaturen als Einzelzeilen (identifizieren
 * das Mineral, Cluster-Tiefe nach Seltenheit gestaffelt), aufsteigend nach
 * Basis-Signatur sortiert, gefolgt von je einer generischen ROC- und FPS-Zeile
 * (die Ground-Signatur codiert nur die Deposit-Größe, nicht das Mineral).
 */
export function buildChartRows(
  profiles: SignatureProfile[],
  ores: Ore[],
): ChartRow[] {
  const oresByCode = new Map(ores.map((o) => [o.code, o]));

  const shipRows: ShipChartRow[] = profiles
    .filter(
      (p): p is SignatureProfile & { signatureValue: number } =>
        p.method === "ship" && p.signatureValue !== undefined,
    )
    .map((p) => {
      const ore = oresByCode.get(p.oreCode);
      const rarityTier = ore?.rarityTier ?? "common";
      return {
        kind: "ship" as const,
        key: p.oreCode,
        method: "ship" as const,
        oreCode: p.oreCode,
        oreName: ore?.name_en ?? p.oreCode,
        rarityTier,
        baseValue: p.signatureValue,
        nodes: toNodes(p.signatureValue, clusterDepthForRarity(rarityTier)),
        dominantCompositionRange: p.dominantCompositionRange,
        notes: p.notes,
      };
    })
    .sort(
      (a, b) => a.baseValue - b.baseValue || a.oreCode.localeCompare(b.oreCode),
    );

  return [...shipRows, groundRow("roc"), groundRow("fps")];
}

/** Größter Knotenwert über alle Zeilen — Grundlage der linearen X-Skala. */
export function chartAxisMax(rows: ChartRow[]): number {
  let max = 0;
  for (const row of rows) {
    for (const node of row.nodes) {
      if (node.value > max) max = node.value;
    }
  }
  return max;
}

export type ScanQuery =
  | { kind: "exact"; value: number }
  | { kind: "tolerance"; value: number }
  | { kind: "range"; min: number; max: number };

/**
 * Parst die Scan-Eingabe: `18000` exakt, `~18000` für ±10 % Toleranz,
 * `12000-20000` als Bereich (vertauschte Grenzen werden normalisiert).
 * Ungültige/leere Eingabe → null.
 */
export function parseScanQuery(input: string): ScanQuery | null {
  const s = input.trim();
  if (!s) return null;

  const rangeMatch = s.match(/^(\d+)\s*-\s*(\d+)$/);
  if (rangeMatch) {
    const a = Number(rangeMatch[1]);
    const b = Number(rangeMatch[2]);
    return { kind: "range", min: Math.min(a, b), max: Math.max(a, b) };
  }

  const toleranceMatch = s.match(/^~\s*(\d+)$/);
  if (toleranceMatch) {
    return { kind: "tolerance", value: Number(toleranceMatch[1]) };
  }

  if (/^\d+$/.test(s)) {
    return { kind: "exact", value: Number(s) };
  }

  return null;
}

export type ScanMatch = { rowKey: string; count: number; value: number };

function nodeMatches(query: ScanQuery, value: number): boolean {
  switch (query.kind) {
    case "exact":
      return value === query.value;
    case "tolerance":
      return Math.abs(value - query.value) <= query.value * SCAN_TOLERANCE;
    case "range":
      return value >= query.min && value <= query.max;
  }
}

/**
 * Bildet einen gescannten Wert rückwärts auf alle passenden Cluster-Stufen
 * ab — ein Wert kann mehrere Erz/×N-Kombinationen treffen (Ship + Ground).
 */
export function matchScanValue(
  query: ScanQuery,
  rows: ChartRow[],
): ScanMatch[] {
  const matches: ScanMatch[] = [];
  for (const row of rows) {
    for (const node of row.nodes) {
      if (nodeMatches(query, node.value)) {
        matches.push({ rowKey: row.key, count: node.count, value: node.value });
      }
    }
  }
  return matches;
}

/** Stabiler Schlüssel eines Knotens für Highlight-Sets im Chart. */
export function nodeKey(rowKey: string, count: number): string {
  return `${rowKey}:${count}`;
}
