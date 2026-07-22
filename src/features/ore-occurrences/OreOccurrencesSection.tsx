"use client";

import { parseAsStringLiteral, useQueryState } from "nuqs";
import { Suspense } from "react";
import { MINING_METHODS } from "@/features/ores/ores.schema";
import { DepositFilter } from "./DepositFilter";
import { matchesDepositFilter } from "./deposit-filter";
import { MethodFilter } from "./MethodFilter";
import { OreOccurrencesTable } from "./OreOccurrencesTable";
import { DEPOSIT_TYPES } from "./ore-occurrences.schema";
import type { OccurrenceWithLocation } from "./ore-occurrences.service";

/**
 * Fundorte eines Erzes mit clientseitigem Methoden-Filter (shallow-URL-
 * State) — der Server liefert alle Methoden, die Seite bleibt ISR-cachebar.
 *
 * useQueryState liest useSearchParams(), was beim statischen Rendern eine
 * Suspense-Boundary verlangt; als Fallback (und damit als statisches HTML
 * für Crawler) dient die ungefilterte Tabelle.
 */
export function OreOccurrencesSection({
  occurrences,
}: {
  occurrences: OccurrenceWithLocation[];
}) {
  return (
    <Suspense fallback={<OreOccurrencesTable occurrences={occurrences} />}>
      <FilteredOccurrences occurrences={occurrences} />
    </Suspense>
  );
}

function FilteredOccurrences({
  occurrences,
}: {
  occurrences: OccurrenceWithLocation[];
}) {
  const [method] = useQueryState(
    "method",
    parseAsStringLiteral(MINING_METHODS),
  );
  const [deposit] = useQueryState(
    "deposit",
    parseAsStringLiteral(DEPOSIT_TYPES),
  );
  const filtered = occurrences.filter(
    (o) =>
      (!method || o.method === method) &&
      matchesDepositFilter(o.depositType, deposit),
  );

  return (
    <>
      <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
        <MethodFilter shallow />
        <DepositFilter shallow />
      </div>
      <OreOccurrencesTable occurrences={filtered} />
    </>
  );
}
