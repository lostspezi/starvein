import { useFormatter, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { SignatureExpandRow } from "@/features/signature-profiles/SignatureExpandRow";
import {
  DataTable,
  DataTableHead,
  DataTableTd,
  DataTableTh,
} from "@/lib/components/ui/DataTable";
import { ConfidenceBadge, ProbabilityCell } from "./OccurrenceBadges";
import type { OccurrenceWithLocation } from "./ore-occurrences.service";

function formatSignature(occurrence: OccurrenceWithLocation): string {
  if (occurrence.signatureValue !== undefined) {
    return String(occurrence.signatureValue);
  }
  if (occurrence.signatureRange) {
    return `${occurrence.signatureRange.min}–${occurrence.signatureRange.max}`;
  }
  return "—";
}

/** "Erz auswählen → alle Fundorte + Wahrscheinlichkeit + Methode". */
export function OreOccurrencesTable({
  occurrences,
}: {
  occurrences: OccurrenceWithLocation[];
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

  // Location + System + Method + Signature + Probability + Raw + Refined + Status + Chevron
  const colSpan = 9;

  return (
    <DataTable aria-label={t("occurrences.whereToFind")}>
      <DataTableHead>
        <DataTableTh>{t("occurrences.table.location")}</DataTableTh>
        <DataTableTh className="hidden sm:table-cell">
          {t("occurrences.table.system")}
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
            key={`${occurrence.systemCode}-${occurrence.bodySlug}-${occurrence.method}`}
            colSpan={colSpan}
            expandLabel={t("occurrences.table.expand")}
            collapseLabel={t("occurrences.table.collapse")}
            panels={[
              {
                method: occurrence.method,
                signatureValue: occurrence.signatureValue,
                signatureRange: occurrence.signatureRange,
              },
            ]}
            rawSell={occurrence.bestRawSell}
            refinedSell={occurrence.bestRefinedSell}
            summary={
              <>
                <DataTableTd>
                  <Link
                    href={`/locations/${occurrence.systemCode.toLowerCase()}/${occurrence.bodySlug}`}
                    className="text-accent-primary hover:text-accent-glow hover:underline"
                  >
                    {occurrence.bodyName}
                  </Link>
                  <span className="ml-2 text-xs text-text-muted">
                    {t(`locations.bodyType.${occurrence.bodyType}`)}
                  </span>
                </DataTableTd>
                <DataTableTd className="hidden text-text-muted sm:table-cell">
                  {occurrence.systemCode}
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
  );
}
