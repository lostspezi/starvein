"use client";

import { useTranslations } from "next-intl";
import { useId } from "react";
import type {
  MiningGadget,
  MiningModule,
} from "@/features/loadouts/equipment.schema";
import { MAX_GLOBAL_MODULES } from "./rock-break";

const selectClass =
  "rounded border border-bg-nebula-2 bg-bg-void px-2 py-1 text-sm focus:border-accent-primary focus:outline-none";

/**
 * Globale Modul-/Gadget-Auswahl: ein Multiset aus bis zu MAX_GLOBAL_MODULES
 * Modulen (Wiederholung erlaubt, "2× Surge" = zwei Slots) plus ein Gadget.
 * Die Tabelle trunkiert die Auswahl pro Laser auf dessen Slot-Anzahl.
 */
export function ModuleGadgetPicker({
  modules,
  gadgets,
  selectedModuleCodes,
  selectedGadgetCode,
  onModulesChange,
  onGadgetChange,
}: {
  modules: MiningModule[];
  gadgets: MiningGadget[];
  selectedModuleCodes: string[];
  selectedGadgetCode: string | null;
  onModulesChange: (codes: string[]) => void;
  onGadgetChange: (code: string | null) => void;
}) {
  const t = useTranslations("calculator.modules");
  const id = useId();

  function setSlot(index: number, code: string) {
    const next = [...selectedModuleCodes];
    next[index] = code;
    onModulesChange(next.filter((entry) => entry !== ""));
  }

  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="text-sm text-text-muted">{t("label")}</legend>
      <div className="flex flex-wrap items-center gap-2">
        {Array.from({ length: MAX_GLOBAL_MODULES }, (_, index) => {
          const slotId = `${id}-module-${index}`;
          return (
            <span key={slotId} className="flex items-center gap-1">
              <label htmlFor={slotId} className="sr-only">
                {t("slot", { index: index + 1 })}
              </label>
              <select
                id={slotId}
                value={selectedModuleCodes[index] ?? ""}
                onChange={(event) => setSlot(index, event.target.value)}
                className={selectClass}
              >
                <option value="">{t("none")}</option>
                {modules.map((module) => (
                  <option key={module.code} value={module.code}>
                    {module.name}
                  </option>
                ))}
              </select>
            </span>
          );
        })}
        <span className="flex items-center gap-1">
          <label htmlFor={`${id}-gadget`} className="text-sm text-text-muted">
            {t("gadgetLabel")}
          </label>
          <select
            id={`${id}-gadget`}
            value={selectedGadgetCode ?? ""}
            onChange={(event) =>
              onGadgetChange(
                event.target.value === "" ? null : event.target.value,
              )
            }
            className={selectClass}
          >
            <option value="">{t("none")}</option>
            {gadgets.map((gadget) => (
              <option key={gadget.code} value={gadget.code}>
                {gadget.name}
              </option>
            ))}
          </select>
        </span>
      </div>
      <p className="text-xs text-text-muted">{t("hint")}</p>
    </fieldset>
  );
}
