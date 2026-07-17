"use client";

import { parseAsStringLiteral, useQueryState } from "nuqs";
import { Suspense } from "react";
import { MINING_METHODS } from "@/features/ores/ores.schema";
import { MethodFilter } from "./MethodFilter";
import { OreOccurrencesTable } from "./OreOccurrencesTable";
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
  const filtered = method
    ? occurrences.filter((o) => o.method === method)
    : occurrences;

  return (
    <>
      <MethodFilter shallow />
      <OreOccurrencesTable occurrences={filtered} />
    </>
  );
}
