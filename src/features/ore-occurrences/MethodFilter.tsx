"use client";

import { useTranslations } from "next-intl";
import { parseAsStringLiteral, useQueryState } from "nuqs";
import { MINING_METHODS } from "@/features/ores/ores.schema";
import { FilterGroup } from "@/lib/components/FilterGroup";

export function MethodFilter() {
  const t = useTranslations("ores");
  const [method, setMethod] = useQueryState(
    "method",
    parseAsStringLiteral(MINING_METHODS).withOptions({ shallow: false }),
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
