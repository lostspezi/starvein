"use client";

import { useTranslations } from "next-intl";
import { parseAsString, parseAsStringLiteral, useQueryState } from "nuqs";
import { useId } from "react";
import { FilterGroup } from "@/lib/components/FilterGroup";
import { LOADOUT_METHODS } from "./equipment.schema";
import { LOADOUT_SORTS } from "./loadouts.schema";

/** Such-, Methoden-, Fahrzeug- und Sortier-Filter der Public-Liste (URL-State). */
export function LoadoutFilters({
  vehicles,
}: {
  vehicles: { code: string; name: string }[];
}) {
  const t = useTranslations("loadouts");
  const vehicleSelectId = useId();
  // shallow: false, damit die Server-Komponente mit neuen searchParams rendert
  const [q, setQ] = useQueryState(
    "q",
    parseAsString.withOptions({ shallow: false, throttleMs: 300 }),
  );
  const [method, setMethod] = useQueryState(
    "method",
    parseAsStringLiteral(LOADOUT_METHODS).withOptions({ shallow: false }),
  );
  const [vehicle, setVehicle] = useQueryState(
    "vehicle",
    parseAsString.withOptions({ shallow: false }),
  );
  const [sort, setSort] = useQueryState(
    "sort",
    parseAsStringLiteral(LOADOUT_SORTS).withOptions({ shallow: false }),
  );

  return (
    <div className="flex flex-col gap-3">
      <input
        type="search"
        value={q ?? ""}
        onChange={(event) => setQ(event.target.value || null)}
        aria-label={t("browse.searchLabel")}
        placeholder={t("browse.searchPlaceholder")}
        className="w-full rounded border border-bg-nebula-2 bg-bg-void px-3 py-1.5 text-sm transition-all duration-150 placeholder:text-text-muted focus:border-accent-primary focus:outline-none sm:max-w-xs"
      />
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <FilterGroup
          label={t("filter.methodLabel")}
          options={LOADOUT_METHODS}
          value={method}
          onChange={setMethod}
          optionLabel={(m) => t(`method.${m}`)}
          allLabel={t("method.all")}
        />
        <div className="flex flex-wrap items-center gap-3">
          <label htmlFor={vehicleSelectId} className="sr-only">
            {t("filter.vehicleLabel")}
          </label>
          <select
            id={vehicleSelectId}
            value={vehicle ?? ""}
            onChange={(event) => setVehicle(event.target.value || null)}
            className="rounded border border-bg-nebula-2 bg-bg-void px-2 py-1 text-sm focus:border-accent-primary focus:outline-none"
          >
            <option value="">{t("filter.vehicleAll")}</option>
            {vehicles.map((v) => (
              <option key={v.code} value={v.code}>
                {v.name}
              </option>
            ))}
          </select>
          <FilterGroup
            label={t("filter.sortLabel")}
            options={LOADOUT_SORTS}
            value={sort ?? "top"}
            onChange={(next) => setSort(next === "top" ? null : next)}
            optionLabel={(s) => t(`sort.${s}`)}
          />
        </div>
      </div>
    </div>
  );
}
