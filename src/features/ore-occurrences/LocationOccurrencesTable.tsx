import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { RarityTier } from "@/features/ores/ores.schema";
import { ConfidenceBadge, ProbabilityCell } from "./OccurrenceBadges";
import type { OccurrenceWithOre } from "./ore-occurrences.service";

const RARITY_TEXT_CLASS: Record<RarityTier, string> = {
  common: "text-rarity-common",
  uncommon: "text-rarity-uncommon",
  rare: "text-rarity-rare",
  epic: "text-rarity-epic",
  legendary: "text-rarity-legendary",
};

/** "Location auswählen → alle Vorkommen dort". */
export function LocationOccurrencesTable({
  occurrences,
}: {
  occurrences: OccurrenceWithOre[];
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
                <ConfidenceBadge occurrence={occurrence} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
