"use client";

import { useTranslations } from "next-intl";
import { parseAsArrayOf, parseAsString, useQueryState } from "nuqs";
import type { Ore } from "@/features/ores/ores.schema";
import { MAX_COMPARE_ORES } from "./compare.constants";

/** Bis zu drei Erz-Slots, gebunden an den URL-Param ?ores=A,B,C. */
export function CompareSelect({ ores }: { ores: Ore[] }) {
  const t = useTranslations("compare");
  const [selected, setSelected] = useQueryState(
    "ores",
    parseAsArrayOf(parseAsString).withOptions({ shallow: false }),
  );
  const current = selected ?? [];

  function updateSlot(index: number, code: string) {
    const next = [...current];
    if (code) {
      next[index] = code;
    } else {
      next.splice(index, 1);
    }
    const cleaned = [...new Set(next.filter(Boolean))].slice(
      0,
      MAX_COMPARE_ORES,
    );
    setSelected(cleaned.length > 0 ? cleaned : null);
  }

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
      {Array.from({ length: MAX_COMPARE_ORES }, (_, index) => (
        <label
          key={index}
          className="flex flex-col gap-1 text-sm text-text-muted"
        >
          {t("slotLabel", { index: index + 1 })}
          <select
            value={current[index] ?? ""}
            onChange={(event) => updateSlot(index, event.target.value)}
            className="rounded border border-bg-nebula-2 bg-bg-void px-2 py-1.5 text-text-primary"
          >
            <option value="">{t("none")}</option>
            {ores.map((ore) => (
              <option key={ore.code} value={ore.code}>
                {ore.name_en} ({ore.code})
              </option>
            ))}
          </select>
        </label>
      ))}
    </div>
  );
}
