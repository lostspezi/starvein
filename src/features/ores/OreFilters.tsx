"use client";

import { useTranslations } from "next-intl";
import { parseAsStringLiteral, useQueryState } from "nuqs";
import { FilterGroup } from "@/lib/components/FilterGroup";
import { MINING_METHODS, RARITY_TIERS } from "./ores.schema";

export function OreFilters() {
  const t = useTranslations("ores");
  // shallow (Default): nur der Client filtert — die Listen-Seiten sind ISR-cachebar
  const [rarity, setRarity] = useQueryState(
    "rarity",
    parseAsStringLiteral(RARITY_TIERS),
  );
  const [method, setMethod] = useQueryState(
    "method",
    parseAsStringLiteral(MINING_METHODS),
  );

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <FilterGroup
        label={t("filter.rarityLabel")}
        options={RARITY_TIERS}
        value={rarity}
        onChange={setRarity}
        optionLabel={(tier) => t(`rarity.${tier}`)}
        allLabel={t("rarity.all")}
      />
      <FilterGroup
        label={t("filter.methodLabel")}
        options={MINING_METHODS}
        value={method}
        onChange={setMethod}
        optionLabel={(m) => t(`method.${m}`)}
        allLabel={t("method.all")}
      />
    </div>
  );
}
