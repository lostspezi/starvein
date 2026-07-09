"use client";

import { useTranslations } from "next-intl";
import { parseAsStringLiteral, useQueryState } from "nuqs";
import { MINING_METHODS, RARITY_TIERS } from "./ores.schema";

function FilterGroup<T extends string>({
  label,
  options,
  value,
  onChange,
  optionLabel,
  allLabel,
}: {
  label: string;
  options: readonly T[];
  value: T | null;
  onChange: (next: T | null) => void;
  optionLabel: (option: T) => string;
  allLabel: string;
}) {
  const baseClass = "rounded px-2 py-1 text-sm";
  const activeClass = `${baseClass} bg-bg-nebula-2 font-medium text-accent-glow`;
  const inactiveClass = `${baseClass} text-text-muted hover:bg-bg-nebula-2 hover:text-text-primary`;

  return (
    <div role="group" aria-label={label} className="flex flex-wrap gap-1">
      <button
        type="button"
        data-value="all"
        onClick={() => onChange(null)}
        className={value === null ? activeClass : inactiveClass}
      >
        {allLabel}
      </button>
      {options.map((option) => (
        <button
          key={option}
          type="button"
          data-value={option}
          onClick={() => onChange(option)}
          className={value === option ? activeClass : inactiveClass}
        >
          {optionLabel(option)}
        </button>
      ))}
    </div>
  );
}

export function OreFilters() {
  const t = useTranslations("ores");
  // shallow: false, damit die Server-Komponente mit neuen searchParams rendert
  const [rarity, setRarity] = useQueryState(
    "rarity",
    parseAsStringLiteral(RARITY_TIERS).withOptions({ shallow: false }),
  );
  const [method, setMethod] = useQueryState(
    "method",
    parseAsStringLiteral(MINING_METHODS).withOptions({ shallow: false }),
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
