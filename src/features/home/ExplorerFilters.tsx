"use client";

import { useTranslations } from "next-intl";
import { parseAsString, parseAsStringLiteral, useQueryState } from "nuqs";
import { SYSTEM_CODES } from "@/features/locations/locations.schema";
import { DEPOSIT_TYPES } from "@/features/ore-occurrences/ore-occurrences.schema";
import {
  MINING_METHODS,
  RARITY_TIERS,
  type Ore,
} from "@/features/ores/ores.schema";
import { FilterGroup } from "@/lib/components/FilterGroup";

export function ExplorerFilters({ ores }: { ores: Ore[] }) {
  const t = useTranslations();
  const [method, setMethod] = useQueryState(
    "method",
    parseAsStringLiteral(MINING_METHODS).withOptions({ shallow: false }),
  );
  const [system, setSystem] = useQueryState(
    "system",
    parseAsStringLiteral(SYSTEM_CODES).withOptions({ shallow: false }),
  );
  const [rarity, setRarity] = useQueryState(
    "rarity",
    parseAsStringLiteral(RARITY_TIERS).withOptions({ shallow: false }),
  );
  const [ore, setOre] = useQueryState(
    "ore",
    parseAsString.withOptions({ shallow: false }),
  );
  const [deposit, setDeposit] = useQueryState(
    "deposit",
    parseAsStringLiteral(DEPOSIT_TYPES).withOptions({ shallow: false }),
  );

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
        <FilterGroup
          label={t("ores.filter.methodLabel")}
          options={MINING_METHODS}
          value={method}
          onChange={setMethod}
          optionLabel={(m) => t(`ores.method.${m}`)}
          allLabel={t("ores.method.all")}
        />
        <FilterGroup
          label={t("home.explorer.systemLabel")}
          options={SYSTEM_CODES}
          value={system}
          onChange={setSystem}
          optionLabel={(code) => code}
          allLabel={t("home.explorer.systemAll")}
        />
      </div>
      <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
        <FilterGroup
          label={t("ores.filter.rarityLabel")}
          options={RARITY_TIERS}
          value={rarity}
          onChange={setRarity}
          optionLabel={(tier) => t(`ores.rarity.${tier}`)}
          allLabel={t("ores.rarity.all")}
        />
        <FilterGroup
          label={t("occurrences.deposit.filterLabel")}
          options={DEPOSIT_TYPES}
          value={deposit}
          onChange={setDeposit}
          optionLabel={(type) =>
            t(
              type === "primary"
                ? "occurrences.deposit.primaryLong"
                : "occurrences.deposit.secondaryLong",
            )
          }
          allLabel={t("occurrences.deposit.filterAll")}
        />
        <div className="flex items-center gap-2 text-sm text-text-muted">
          <label htmlFor="explorer-ore-select">
            {t("home.explorer.oreLabel")}
          </label>
          <select
            id="explorer-ore-select"
            value={ore ?? ""}
            onChange={(event) => setOre(event.target.value || null)}
            className="rounded border border-bg-nebula-2 bg-bg-void px-2 py-1.5 text-text-primary"
          >
            <option value="">{t("home.explorer.oreAll")}</option>
            {ores.map((o) => (
              <option key={o.code} value={o.code}>
                {o.name_en} ({o.code})
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}
