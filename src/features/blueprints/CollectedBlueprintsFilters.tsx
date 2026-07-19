"use client";

import { useTranslations } from "next-intl";
import { parseAsString, parseAsStringLiteral, useQueryState } from "nuqs";
import { FilterGroup } from "@/lib/components/FilterGroup";
import { BLUEPRINT_CATEGORIES } from "./blueprints.schema";
import { CRAFT_STATUSES } from "./craftability";

/**
 * Filterleiste für die Sammlungs-Übersicht: Freitext (Name) plus Kategorie-
 * und Craft-Status-Gruppen. shallow-URL-State (Default) — die Seite ist ohnehin
 * force-dynamic, gefiltert wird rein clientseitig. Kategorie-/Status-Labels
 * werden aus den bestehenden Namespaces gespiegelt (wie in CraftableList).
 */
export function CollectedBlueprintsFilters() {
  const t = useTranslations("collectedBlueprints");
  const tBlueprints = useTranslations("blueprints");
  const tCraftable = useTranslations("craftable");

  const [category, setCategory] = useQueryState(
    "category",
    parseAsStringLiteral(BLUEPRINT_CATEGORIES),
  );
  const [status, setStatus] = useQueryState(
    "status",
    parseAsStringLiteral(CRAFT_STATUSES),
  );
  const [q, setQ] = useQueryState(
    "q",
    parseAsString.withOptions({ throttleMs: 300 }),
  );

  return (
    <div className="flex flex-col gap-3">
      <input
        type="search"
        aria-label={t("filter.searchLabel")}
        placeholder={t("filter.searchPlaceholder")}
        value={q ?? ""}
        onChange={(event) => setQ(event.target.value || null)}
        className="w-full rounded border border-bg-nebula-2 bg-bg-void px-3 py-1.5 text-sm transition-all duration-150 placeholder:text-text-muted focus:border-accent-primary focus:outline-none sm:max-w-xs"
      />
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:gap-6">
        <FilterGroup
          label={t("filter.categoryLabel")}
          options={BLUEPRINT_CATEGORIES}
          value={category}
          onChange={setCategory}
          optionLabel={(c) => tBlueprints(`category.${c}`)}
          allLabel={tBlueprints("category.all")}
        />
        <FilterGroup
          label={t("filter.statusLabel")}
          options={CRAFT_STATUSES}
          value={status}
          onChange={setStatus}
          optionLabel={(s) => tCraftable(`status.${s}`)}
          allLabel={t("filter.statusAll")}
        />
      </div>
    </div>
  );
}
