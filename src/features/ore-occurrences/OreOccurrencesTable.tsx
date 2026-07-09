import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { ConfidenceBadge, ProbabilityCell } from "./OccurrenceBadges";
import type { OccurrenceWithLocation } from "./ore-occurrences.service";

/** "Erz auswählen → alle Fundorte + Wahrscheinlichkeit + Methode". */
export function OreOccurrencesTable({
  occurrences,
}: {
  occurrences: OccurrenceWithLocation[];
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
              {t("occurrences.table.location")}
            </th>
            <th className="hidden px-4 py-3 font-medium sm:table-cell">
              {t("occurrences.table.system")}
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
              key={`${occurrence.systemCode}-${occurrence.bodySlug}-${occurrence.method}`}
              className="border-b border-bg-nebula-2 last:border-b-0 hover:bg-bg-nebula-2"
            >
              <td className="px-4 py-3">
                <Link
                  href={`/locations/${occurrence.systemCode.toLowerCase()}/${occurrence.bodySlug}`}
                  className="text-accent-primary hover:text-accent-glow hover:underline"
                >
                  {occurrence.bodyName}
                </Link>
                <span className="ml-2 text-xs text-text-muted">
                  {t(`locations.bodyType.${occurrence.bodyType}`)}
                </span>
              </td>
              <td className="hidden px-4 py-3 text-text-muted sm:table-cell">
                {occurrence.systemCode}
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
