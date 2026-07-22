"use client";

import { useTranslations } from "next-intl";
import { parseAsStringLiteral, useQueryState } from "nuqs";
import { FilterGroup } from "@/lib/components/FilterGroup";
import { DEPOSIT_TYPES } from "./ore-occurrences.schema";

/**
 * Vorkommens-Typ-Filter (Haupt/Neben). `shallow` steuert wie beim
 * MethodFilter, ob nur der Client filtert (ISR-Seiten) oder die
 * Server-Komponente mit neuen searchParams rendert.
 */
export function DepositFilter({ shallow = false }: { shallow?: boolean }) {
  const t = useTranslations("occurrences");
  const [deposit, setDeposit] = useQueryState(
    "deposit",
    parseAsStringLiteral(DEPOSIT_TYPES).withOptions({ shallow }),
  );

  return (
    <FilterGroup
      label={t("deposit.filterLabel")}
      options={DEPOSIT_TYPES}
      value={deposit}
      onChange={setDeposit}
      optionLabel={(option) =>
        t(
          option === "primary"
            ? "deposit.primaryLong"
            : "deposit.secondaryLong",
        )
      }
      allLabel={t("deposit.filterAll")}
    />
  );
}
