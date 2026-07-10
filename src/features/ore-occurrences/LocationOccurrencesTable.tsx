import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
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
    <div className="overflow-x-auto rounded-lg border border-bg-nebula-2 bg-bg-nebula">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-bg-nebula-2 text-text-muted">
            <th className="px-4 py-3 font-medium">
              {t("occurrences.table.ore")}
            </th>
            <th className="hidden px-4 py-3 font-medium sm:table-cell">
              {t("occurrences.table.rarity")}
            </th>
            <th className="px-4 py-3 font-medium">
              {t("occurrences.table.method")}
            </th>
            <th className="px-4 py-3 font-medium">
              {t("occurrences.table.probability")}
            </th>
            <th className="px-4 py-3 font-medium">
              {t("occurrences.table.status")}
            </th>
          </tr>
        </thead>
        <tbody>
          {occurrences.map((occurrence) => (
            <tr
              key={`${occurrence.oreCode}-${occurrence.method}`}
              className="border-b border-bg-nebula-2 last:border-b-0 hover:bg-bg-nebula-2"
            >
              <td className="px-4 py-3">
                <Link
                  href={`/ores/${occurrence.oreCode.toLowerCase()}`}
                  className="text-accent-primary hover:text-accent-glow hover:underline"
                >
                  {occurrence.oreName}
                </Link>
                <span className="ml-2 font-mono text-xs text-text-muted">
                  {occurrence.oreCode}
                </span>
              </td>
              <td
                className={`hidden px-4 py-3 sm:table-cell ${RARITY_TEXT_CLASS[occurrence.rarityTier]}`}
              >
                {t(`ores.rarity.${occurrence.rarityTier}`)}
              </td>
              <td className="px-4 py-3">
                {t(`ores.method.${occurrence.method}`)}
              </td>
              <td className="px-4 py-3">
                <ProbabilityCell percent={occurrence.probabilityPercent} />
              </td>
              <td className="px-4 py-3">
                <span className="flex flex-wrap gap-1">
                  <ConfidenceBadge occurrence={occurrence} />
                  {disputedKeys?.has(
                    `${occurrence.oreCode}|${occurrence.method}`,
                  ) && (
                    <span className="rounded bg-bg-nebula-2 px-1.5 py-0.5 text-xs text-rarity-epic">
                      {t("submissions.disputed")}
                    </span>
                  )}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
