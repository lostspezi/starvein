"use client";

import { useTranslations } from "next-intl";
import { useId } from "react";

const inputClass =
  "w-full rounded border border-bg-nebula-2 bg-bg-void px-3 py-1.5 font-mono text-sm transition-all duration-150 placeholder:text-text-muted focus:border-accent-primary focus:outline-none";

function parseValue(raw: string): number | null {
  if (raw.trim() === "") return null;
  const value = Number(raw);
  return Number.isFinite(value) ? value : null;
}

/** Masse-/Resistenz-Eingaben; State liegt im Parent (URL via nuqs). */
export function RockInputs({
  mass,
  resistancePct,
  onMassChange,
  onResistanceChange,
}: {
  mass: number | null;
  resistancePct: number | null;
  onMassChange: (value: number | null) => void;
  onResistanceChange: (value: number | null) => void;
}) {
  const t = useTranslations("calculator.inputs");
  const id = useId();

  return (
    <div className="flex flex-col gap-3 sm:flex-row">
      <div className="flex flex-1 flex-col gap-1">
        <label htmlFor={`${id}-mass`} className="text-sm text-text-muted">
          {t("massLabel")}
        </label>
        <input
          id={`${id}-mass`}
          type="number"
          min={1}
          inputMode="numeric"
          placeholder={t("massPlaceholder")}
          value={mass ?? ""}
          onChange={(event) => onMassChange(parseValue(event.target.value))}
          className={inputClass}
        />
      </div>
      <div className="flex flex-1 flex-col gap-1">
        <label htmlFor={`${id}-resistance`} className="text-sm text-text-muted">
          {t("resistanceLabel")}
        </label>
        <input
          id={`${id}-resistance`}
          type="number"
          min={0}
          max={100}
          inputMode="numeric"
          value={resistancePct ?? ""}
          onChange={(event) =>
            onResistanceChange(parseValue(event.target.value))
          }
          className={inputClass}
        />
      </div>
    </div>
  );
}
