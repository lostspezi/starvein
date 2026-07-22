"use client";

import { useTranslations } from "next-intl";
import { parseAsStringLiteral, useQueryState } from "nuqs";
import { Suspense } from "react";
import { MINING_METHODS } from "@/features/ores/ores.schema";
import { DepositFilter } from "./DepositFilter";
import { matchesDepositFilter } from "./deposit-filter";
import { MethodFilter } from "./MethodFilter";
import { LocationOccurrencesTable } from "./LocationOccurrencesTable";
import { DEPOSIT_TYPES } from "./ore-occurrences.schema";
import type { OccurrenceWithOre } from "./ore-occurrences.service";

/**
 * Vorkommen einer Location mit clientseitigem Methoden-Filter (shallow-
 * URL-State) — der Server liefert alle Methoden inkl. Parent-Roll-up,
 * die Body-Seite bleibt dadurch ISR-cachebar.
 *
 * useQueryState liest useSearchParams(), was beim statischen Rendern eine
 * Suspense-Boundary verlangt; als Fallback (und damit als statisches HTML
 * für Crawler) dient die ungefilterte Tabelle.
 */
export function LocationOccurrencesSection({
  occurrences,
  inheritedFromName,
}: {
  occurrences: OccurrenceWithOre[];
  /** Name des Parent-Bodys, wenn die Vorkommen geerbt sind (Roll-up). */
  inheritedFromName: string | null;
}) {
  return (
    <Suspense
      fallback={
        <SectionBody
          occurrences={occurrences}
          inheritedFromName={inheritedFromName}
        />
      }
    >
      <FilteredSection
        occurrences={occurrences}
        inheritedFromName={inheritedFromName}
      />
    </Suspense>
  );
}

function FilteredSection({
  occurrences,
  inheritedFromName,
}: {
  occurrences: OccurrenceWithOre[];
  inheritedFromName: string | null;
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
    <SectionBody
      occurrences={filtered}
      inheritedFromName={inheritedFromName}
      withFilter
    />
  );
}

function SectionBody({
  occurrences,
  inheritedFromName,
  withFilter = false,
}: {
  occurrences: OccurrenceWithOre[];
  inheritedFromName: string | null;
  withFilter?: boolean;
}) {
  const t = useTranslations("occurrences");

  return (
    <>
      {withFilter && (
        <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
          <MethodFilter shallow />
          <DepositFilter shallow />
        </div>
      )}
      {inheritedFromName && (
        <p className="text-sm text-text-muted">
          {t("inheritedFrom", { name: inheritedFromName })}
        </p>
      )}
      <LocationOccurrencesTable occurrences={occurrences} />
    </>
  );
}
