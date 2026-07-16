"use client";

import { useTranslations } from "next-intl";
import {
  parseAsInteger,
  parseAsString,
  parseAsStringLiteral,
  useQueryState,
} from "nuqs";
import { useId } from "react";
import { FilterGroup } from "@/lib/components/FilterGroup";
import { BLUEPRINT_CATEGORIES } from "./blueprints.schema";

/**
 * Such-, Kategorie-, Material- und Sammlungs-Filter der Blueprint-Liste
 * (URL-State). Der "Gesammelt"-Filter erscheint nur für angemeldete Nutzer.
 */
export function BlueprintFilters({
  materials,
  isAuthenticated,
}: {
  materials: { code: string; name: string }[];
  isAuthenticated: boolean;
}) {
  const t = useTranslations("blueprints");
  const materialSelectId = useId();
  // shallow: false, damit die Server-Komponente mit neuen searchParams rendert
  const [q, setQ] = useQueryState(
    "q",
    parseAsString.withOptions({ shallow: false, throttleMs: 300 }),
  );
  const [category, setCategory] = useQueryState(
    "category",
    parseAsStringLiteral(BLUEPRINT_CATEGORIES).withOptions({ shallow: false }),
  );
  const [material, setMaterial] = useQueryState(
    "material",
    parseAsString.withOptions({ shallow: false }),
  );
  const [collected, setCollected] = useQueryState(
    "collected",
    parseAsString.withOptions({ shallow: false }),
  );
  // Jede Filteränderung springt zurück auf Seite 1 — sonst landet man auf
  // einer Seite, die es im gefilterten Ergebnis nicht mehr gibt.
  const [, setPage] = useQueryState(
    "page",
    parseAsInteger.withOptions({ shallow: false }),
  );

  return (
    <div className="flex flex-col gap-3">
      <input
        type="search"
        value={q ?? ""}
        onChange={(event) => {
          void setPage(null);
          void setQ(event.target.value || null);
        }}
        aria-label={t("filter.searchLabel")}
        placeholder={t("filter.searchPlaceholder")}
        className="w-full rounded border border-bg-nebula-2 bg-bg-void px-3 py-1.5 text-sm transition-all duration-150 placeholder:text-text-muted focus:border-accent-primary focus:outline-none sm:max-w-xs"
      />
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <FilterGroup
          label={t("filter.categoryLabel")}
          options={BLUEPRINT_CATEGORIES}
          value={category}
          onChange={(next) => {
            void setPage(null);
            void setCategory(next);
          }}
          optionLabel={(c) => t(`category.${c}`)}
          allLabel={t("category.all")}
        />
        <div className="flex flex-wrap items-center gap-3">
          {isAuthenticated && (
            <button
              type="button"
              aria-pressed={collected === "1"}
              onClick={() => {
                void setPage(null);
                void setCollected(collected === "1" ? null : "1");
              }}
              className={`rounded px-2 py-1 text-sm transition-all duration-150 ${
                collected === "1"
                  ? "bg-bg-nebula-2 font-medium text-accent-cyan shadow-glow-sm"
                  : "text-text-muted hover:bg-bg-nebula-2 hover:text-text-primary"
              }`}
            >
              {t("filter.collectedOnly")}
            </button>
          )}
          <label htmlFor={materialSelectId} className="sr-only">
            {t("filter.materialLabel")}
          </label>
          <select
            id={materialSelectId}
            value={material ?? ""}
            onChange={(event) => {
              void setPage(null);
              void setMaterial(event.target.value || null);
            }}
            className="rounded border border-bg-nebula-2 bg-bg-void px-2 py-1 text-sm focus:border-accent-primary focus:outline-none"
          >
            <option value="">{t("filter.materialAll")}</option>
            {materials.map((m) => (
              <option key={m.code} value={m.code}>
                {m.name}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}
