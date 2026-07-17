"use client";

import { parseAsStringLiteral, useQueryState } from "nuqs";
import { OreFilters } from "./OreFilters";
import { OreList } from "./OreList";
import { filterOres } from "./ores.filter";
import { MINING_METHODS, RARITY_TIERS, type Ore } from "./ores.schema";

/**
 * Clientseitige Filterung der vollständigen Erzliste (37 Einträge) über
 * shallow-URL-State — die Server-Komponente bleibt dadurch ISR-cachebar.
 */
export function OreListSection({ ores }: { ores: Ore[] }) {
  const [rarity] = useQueryState("rarity", parseAsStringLiteral(RARITY_TIERS));
  const [method] = useQueryState(
    "method",
    parseAsStringLiteral(MINING_METHODS),
  );

  return (
    <>
      <OreFilters />
      <OreList ores={filterOres(ores, { rarity, method })} />
    </>
  );
}
