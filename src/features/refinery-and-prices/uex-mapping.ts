/**
 * Mapping von UEX-Commodities auf unsere Erz-Codes.
 *
 * UEX führt Raw- und Refined-Varianten als getrennte Commodities. Meist
 * teilen sie sich den Code (GOLD/GOLD), einige Raw-Varianten haben aber
 * eigene Codes — die löst die Alias-Tabelle auf. JACL (refined Jaclium)
 * zeigt auf unser JACO, weil die Referenz-Erzcode-Liste (CLAUDE.md §5)
 * den Ore-Code als kanonisch definiert.
 */
const CODE_ALIASES: Record<string, string> = {
  IRONO: "IRON",
  TINO: "TIN",
  TORIO: "TORI",
  RICO: "RICC",
  SAVW: "SAVR",
  ASLW: "ASLA",
  LINW: "LIND",
  OURW: "OURA",
  JACL: "JACO",
  CARP: "CARI",
};

export type UexCommodity = {
  id: number;
  code: string;
  name: string;
  is_raw: number;
};

export type MappedCommodity = {
  oreCode: string;
  kind: "raw" | "refined";
};

export function mapUexCommodity(
  commodity: UexCommodity,
  knownOreCodes: Set<string>,
): MappedCommodity | null {
  const oreCode = knownOreCodes.has(commodity.code)
    ? commodity.code
    : CODE_ALIASES[commodity.code];

  if (!oreCode || !knownOreCodes.has(oreCode)) {
    return null;
  }

  const isRaw =
    commodity.is_raw === 1 ||
    commodity.name.includes("(Ore)") ||
    commodity.name.includes("(Raw)");

  return { oreCode, kind: isRaw ? "raw" : "refined" };
}
