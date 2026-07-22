import type { DepositType } from "./ore-occurrences.schema";

/**
 * Client-Semantik des Vorkommens-Typ-Filters (Spiegel der Mongo-Query in
 * findAllOccurrences): "primary" schließt nur explizite Nebenprodukte aus —
 * Zeilen ohne Deposit-Daten (Alt-Bestand, unbekannte Wiki-Gruppen) bleiben
 * sichtbar; "secondary" matcht nur explizite Nebenprodukte.
 */
export function matchesDepositFilter(
  depositType: DepositType | undefined,
  filter: DepositType | null,
): boolean {
  if (!filter) return true;
  if (filter === "primary") return depositType !== "secondary";
  return depositType === "secondary";
}
