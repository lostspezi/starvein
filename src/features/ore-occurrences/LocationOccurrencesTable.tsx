import { useFormatter, useTranslations } from "next-intl";
import { SignatureExpandRow } from "@/features/signature-profiles/SignatureExpandRow";
import {
  DataTable,
  DataTableHead,
  DataTableTd,
  DataTableTh,
} from "@/lib/components/ui/DataTable";
import { GlowLink } from "@/lib/components/ui/GlowLink";
import { RARITY_TEXT_CLASS } from "@/lib/rarity";
import {
  ConfidenceBadge,
  DepositBadge,
  ProbabilityCell,
  toDepositPanelData,
} from "./OccurrenceBadges";
import type { OccurrenceWithOre } from "./ore-occurrences.service";

function formatSignature(occurrence: OccurrenceWithOre): string {
  if (occurrence.signatureValue !== undefined) {
    return String(occurrence.signatureValue);
  }
  if (occurrence.signatureRange) {
    return `${occurrence.signatureRange.min}–${occurrence.signatureRange.max}`;
  }
  return "—";
}

/** "Location auswählen → alle Vorkommen dort". */
export function LocationOccurrencesTable({
  occurrences,
}: {
  occurrences: OccurrenceWithOre[];
}) {
  const t = useTranslations();
  const format = useFormatter();

  const formatSell = (price: number | null) =>
    price === null ? "–" : format.number(price);

  if (occurrences.length === 0) {
    return (
      <p className="py-6 text-center text-text-muted">
        {t("occurrences.empty")}
      </p>
    );
  }

  // ROC/FPS-Signaturen codieren nur die Deposit-Größe, nicht das Mineral
  // (CLAUDE.md §5) — der Hinweis verhindert die falsche 1:1-Erwartung.
  const hasGroundRows = occurrences.some((o) => o.method !== "ship");
  // Ore + Rarity + Method + Signature + Probability + Raw + Refined + Status + Chevron
  const colSpan = 9;

  return (
    <div className="flex flex-col gap-2">
      <DataTable>
        <DataTableHead>
          <DataTableTh>{t("occurrences.table.ore")}</DataTableTh>
          <DataTableTh className="hidden sm:table-cell">
            {t("occurrences.table.rarity")}
          </DataTableTh>
          <DataTableTh>{t("occurrences.table.method")}</DataTableTh>
          <DataTableTh className="hidden sm:table-cell">
            {t("occurrences.table.signature")}
          </DataTableTh>
          <DataTableTh>{t("occurrences.table.probability")}</DataTableTh>
          <DataTableTh className="hidden text-right md:table-cell">
            {t("occurrences.table.sellRaw")}
          </DataTableTh>
          <DataTableTh className="hidden text-right md:table-cell">
            {t("occurrences.table.sellRefined")}
          </DataTableTh>
          <DataTableTh>{t("occurrences.table.status")}</DataTableTh>
          <DataTableTh className="w-8" />
        </DataTableHead>
        <tbody>
          {occurrences.map((occurrence) => (
            <SignatureExpandRow
              key={`${occurrence.oreCode}-${occurrence.method}`}
              colSpan={colSpan}
              expandLabel={t("occurrences.table.expand")}
              collapseLabel={t("occurrences.table.collapse")}
              panels={[
                {
                  method: occurrence.method,
                  signatureValue: occurrence.signatureValue,
                  signatureRange: occurrence.signatureRange,
                  deposit: toDepositPanelData(occurrence),
                },
              ]}
              rawSell={occurrence.bestRawSell}
              refinedSell={occurrence.bestRefinedSell}
              summary={
                <>
                  <DataTableTd>
                    <GlowLink
                      href={`/ores/${occurrence.oreCode.toLowerCase()}`}
                    >
                      {occurrence.oreName}
                    </GlowLink>
                    <span className="ml-2 font-mono text-xs text-text-muted">
                      {occurrence.oreCode}
                    </span>
                    <span className="ml-2">
                      <DepositBadge depositType={occurrence.depositType} />
                    </span>
                  </DataTableTd>
                  <DataTableTd
                    className={`hidden sm:table-cell ${RARITY_TEXT_CLASS[occurrence.rarityTier]}`}
                  >
                    {t(`ores.rarity.${occurrence.rarityTier}`)}
                  </DataTableTd>
                  <DataTableTd>
                    {t(`ores.method.${occurrence.method}`)}
                  </DataTableTd>
                  <DataTableTd className="hidden sm:table-cell">
                    <span
                      className={`font-mono ${
                        occurrence.method === "ship"
                          ? "text-accent-secondary"
                          : "text-text-muted"
                      }`}
                    >
                      {formatSignature(occurrence)}
                    </span>
                  </DataTableTd>
                  <DataTableTd>
                    <ProbabilityCell percent={occurrence.probabilityPercent} />
                  </DataTableTd>
                  <DataTableTd className="hidden text-right font-mono md:table-cell">
                    {formatSell(occurrence.bestRawSell)}
                  </DataTableTd>
                  <DataTableTd className="hidden text-right font-mono md:table-cell">
                    {formatSell(occurrence.bestRefinedSell)}
                  </DataTableTd>
                  <DataTableTd>
                    <ConfidenceBadge occurrence={occurrence} />
                  </DataTableTd>
                </>
              }
            />
          ))}
        </tbody>
      </DataTable>
      {hasGroundRows && (
        <p className="text-xs text-text-muted">
          {t("occurrences.signatureGroundNote")}
        </p>
      )}
    </div>
  );
}
