"use client";

import { useTranslations } from "next-intl";
import { parseAsStringLiteral, useQueryState } from "nuqs";
import { MINING_METHODS } from "@/features/ores/ores.schema";
import { FilterGroup } from "@/lib/components/FilterGroup";

/**
 * Methoden-Filter (Ship/ROC/FPS). `shallow` steuert, ob nur der Client
 * filtert (ISR-Seiten) oder die Server-Komponente mit neuen searchParams
 * rendert (dynamische Seiten wie /occurrences).
 */
export function MethodFilter({ shallow = false }: { shallow?: boolean }) {
  const t = useTranslations("ores");
  const [method, setMethod] = useQueryState(
    "method",
    parseAsStringLiteral(MINING_METHODS).withOptions({ shallow }),
  );

  return (
    <FilterGroup
      label={t("filter.methodLabel")}
      options={MINING_METHODS}
      value={method}
      onChange={setMethod}
      optionLabel={(option) => t(`method.${option}`)}
      allLabel={t("method.all")}
    />
  );
}
