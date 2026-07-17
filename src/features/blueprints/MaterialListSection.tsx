"use client";

import { parseAsString, parseAsStringLiteral, useQueryState } from "nuqs";
import { MaterialFilters } from "./MaterialFilters";
import { MaterialList } from "./MaterialList";
import { filterMaterials } from "./materials.filter";
import { MATERIAL_KINDS, type Material } from "./materials.schema";

/**
 * Clientseitige Filterung des Materialkatalogs (37 Einträge) über
 * shallow-URL-State — die Server-Komponente bleibt dadurch ISR-cachebar.
 */
export function MaterialListSection({ materials }: { materials: Material[] }) {
  const [kind] = useQueryState("kind", parseAsStringLiteral(MATERIAL_KINDS));
  const [q] = useQueryState("q", parseAsString);
  const [ores] = useQueryState("ores", parseAsString);

  return (
    <>
      <MaterialFilters />
      <MaterialList
        materials={filterMaterials(materials, {
          kind,
          q,
          oresOnly: ores === "1",
        })}
      />
    </>
  );
}
