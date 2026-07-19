"use client";

import { parseAsString, parseAsStringLiteral, useQueryState } from "nuqs";
import { CollectedBlueprintsFilters } from "./CollectedBlueprintsFilters";
import { CraftableList } from "./CraftableList";
import { BLUEPRINT_CATEGORIES } from "./blueprints.schema";
import { filterCollectedBlueprints } from "./collected-blueprints.filter";
import { CRAFT_STATUSES } from "./craftability";
import type { CraftableBlueprint } from "./craftable-blueprints.service";
import type { Material } from "./materials.schema";

/**
 * Clientseitige Filterung der (vorbewerteten) Sammlung über shallow-URL-State.
 * Die Craftability ist serverseitig aus dem Lager berechnet und kommt als Prop;
 * die Liste selbst wird von der geteilten CraftableList gerendert.
 */
export function CollectedBlueprintsSection({
  entries,
  materialsByCode,
  emptyLabel,
}: {
  entries: CraftableBlueprint[];
  materialsByCode: Record<string, Material>;
  emptyLabel: string;
}) {
  const [q] = useQueryState("q", parseAsString);
  const [category] = useQueryState(
    "category",
    parseAsStringLiteral(BLUEPRINT_CATEGORIES),
  );
  const [status] = useQueryState(
    "status",
    parseAsStringLiteral(CRAFT_STATUSES),
  );

  const filtered = filterCollectedBlueprints(entries, { q, category, status });

  return (
    <>
      <CollectedBlueprintsFilters />
      <CraftableList
        entries={filtered}
        materialsByCode={materialsByCode}
        emptyLabel={emptyLabel}
      />
    </>
  );
}
