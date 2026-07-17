"use client";

import { useTranslations } from "next-intl";
import { parseAsString, parseAsStringLiteral, useQueryState } from "nuqs";
import { FilterGroup } from "@/lib/components/FilterGroup";
import { MATERIAL_KINDS } from "./materials.schema";

export function MaterialFilters() {
  const t = useTranslations("materials");
  // shallow (Default): nur der Client filtert — die Listen-Seiten sind ISR-cachebar
  const [kind, setKind] = useQueryState(
    "kind",
    parseAsStringLiteral(MATERIAL_KINDS),
  );
  const [q, setQ] = useQueryState(
    "q",
    parseAsString.withOptions({ throttleMs: 300 }),
  );
  const [ores, setOres] = useQueryState("ores", parseAsString);

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
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <FilterGroup
          label={t("filter.kindLabel")}
          options={MATERIAL_KINDS}
          value={kind}
          onChange={setKind}
          optionLabel={(k) => t(`kind.${k}`)}
          allLabel={t("kind.all")}
        />
        <button
          type="button"
          aria-pressed={ores === "1"}
          onClick={() => setOres(ores === "1" ? null : "1")}
          className={`self-start rounded px-2 py-1 text-sm transition-all duration-150 ${
            ores === "1"
              ? "bg-bg-nebula-2 font-medium text-accent-cyan shadow-glow-sm"
              : "text-text-muted hover:bg-bg-nebula-2 hover:text-text-primary"
          }`}
        >
          {t("filter.oresOnly")}
        </button>
      </div>
    </div>
  );
}
