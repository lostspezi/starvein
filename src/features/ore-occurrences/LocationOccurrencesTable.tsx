import { useTranslations } from "next-intl";
import { Badge } from "@/lib/components/ui/Badge";
import {
  DataTable,
  DataTableHead,
  DataTableRow,
  DataTableTd,
  DataTableTh,
} from "@/lib/components/ui/DataTable";
import { GlowLink } from "@/lib/components/ui/GlowLink";
import { RARITY_TEXT_CLASS } from "@/lib/rarity";
import { ConfidenceBadge, ProbabilityCell } from "./OccurrenceBadges";
import type { OccurrenceWithOre } from "./ore-occurrences.service";

/** "Location auswählen → alle Vorkommen dort". */
export function LocationOccurrencesTable({
  occurrences,
  disputedKeys,
}: {
  occurrences: OccurrenceWithOre[];
  /** Schlüssel "ORECODE|methode" mit stark unterstützter Korrektur-Submission */
  disputedKeys?: Set<string>;
}) {
  const t = useTranslations();

  if (occurrences.length === 0) {
    return (
      <p className="py-6 text-center text-text-muted">
        {t("occurrences.empty")}
      </p>
    );
  }

  return (
    <DataTable>
      <DataTableHead>
        <DataTableTh>{t("occurrences.table.ore")}</DataTableTh>
        <DataTableTh className="hidden sm:table-cell">
          {t("occurrences.table.rarity")}
        </DataTableTh>
        <DataTableTh>{t("occurrences.table.method")}</DataTableTh>
        <DataTableTh>{t("occurrences.table.probability")}</DataTableTh>
        <DataTableTh>{t("occurrences.table.status")}</DataTableTh>
      </DataTableHead>
      <tbody>
        {occurrences.map((occurrence) => (
          <DataTableRow key={`${occurrence.oreCode}-${occurrence.method}`}>
            <DataTableTd>
              <GlowLink href={`/ores/${occurrence.oreCode.toLowerCase()}`}>
                {occurrence.oreName}
              </GlowLink>
              <span className="ml-2 font-mono text-xs text-text-muted">
                {occurrence.oreCode}
              </span>
            </DataTableTd>
            <DataTableTd
              className={`hidden sm:table-cell ${RARITY_TEXT_CLASS[occurrence.rarityTier]}`}
            >
              {t(`ores.rarity.${occurrence.rarityTier}`)}
            </DataTableTd>
            <DataTableTd>{t(`ores.method.${occurrence.method}`)}</DataTableTd>
            <DataTableTd>
              <ProbabilityCell percent={occurrence.probabilityPercent} />
            </DataTableTd>
            <DataTableTd>
              <span className="flex flex-wrap gap-1">
                <ConfidenceBadge occurrence={occurrence} />
                {disputedKeys?.has(
                  `${occurrence.oreCode}|${occurrence.method}`,
                ) && (
                  <Badge className="text-rarity-epic">
                    {t("submissions.disputed")}
                  </Badge>
                )}
              </span>
            </DataTableTd>
          </DataTableRow>
        ))}
      </tbody>
    </DataTable>
  );
}
