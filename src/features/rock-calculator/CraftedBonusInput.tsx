"use client";

import { useTranslations } from "next-intl";
import { useId } from "react";
import { CRAFTED_BONUS_MAX_PCT, CRAFTED_BONUS_MIN_PCT } from "./rock-break";

const inputClass =
  "w-full rounded border border-bg-nebula-2 bg-bg-void px-3 py-1.5 font-mono text-sm transition-all duration-150 placeholder:text-text-muted focus:border-accent-primary focus:outline-none sm:max-w-48";

function parseValue(raw: string): number | null {
  if (raw.trim() === "") return null;
  const value = Number(raw);
  return Number.isFinite(value) ? value : null;
}

/** Prozent-Bonus eines selbst gecrafteten Lasers; State liegt im Parent. */
export function CraftedBonusInput({
  value,
  onChange,
}: {
  value: number | null;
  onChange: (value: number | null) => void;
}) {
  const t = useTranslations("calculator.bonus");
  const id = useId();

  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-sm text-text-muted">
        {t("label")}
      </label>
      <input
        id={id}
        type="number"
        min={CRAFTED_BONUS_MIN_PCT}
        max={CRAFTED_BONUS_MAX_PCT}
        inputMode="numeric"
        placeholder="0"
        value={value ?? ""}
        onChange={(event) => onChange(parseValue(event.target.value))}
        className={inputClass}
      />
      <p className="text-xs text-text-muted">{t("hint")}</p>
    </div>
  );
}
