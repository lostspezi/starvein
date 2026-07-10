import { useFormatter, useTranslations } from "next-intl";
import { FavoriteButton } from "@/features/favorites/FavoriteButton";
import { Link } from "@/i18n/navigation";
import { RARITY_TEXT_CLASS } from "@/lib/rarity";
import type { ExplorerRow } from "./explorer.service";

/**
 * Explorer-Tabelle der Startseite: alle Vorkommen mit Erz, Location,
 * Methode, Wahrscheinlichkeit, bestem Refined-Verkaufspreis und
 * Favoriten-Stern (nur eingeloggt). favoriteKeys: "SYSTEM|slug".
 */
export function ExplorerTable({
  rows,
  favoriteKeys,
  isAuthenticated,
}: {
  rows: ExplorerRow[];
  favoriteKeys: Set<string>;
  isAuthenticated: boolean;
}) {
  const t = useTranslations();
  const format = useFormatter();

  return (
    <div className="overflow-x-auto rounded-lg border border-bg-nebula-2 bg-bg-nebula">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-bg-nebula-2 text-text-muted">
            <th className="px-3 py-3 font-medium sm:px-4">
              {t("occurrences.table.ore")}
            </th>
            <th className="px-3 py-3 font-medium sm:px-4">
              {t("occurrences.table.location")}
            </th>
            <th className="hidden px-4 py-3 font-medium sm:table-cell">
              {t("occurrences.table.method")}
            </th>
            <th className="px-3 py-3 text-right font-medium sm:px-4">
              {t("occurrences.table.probability")}
            </th>
            <th className="px-3 py-3 text-right font-medium sm:px-4">
              {t("home.explorer.priceHeader")}
            </th>
            {isAuthenticated && <th className="px-2 py-3" />}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td
                colSpan={isAuthenticated ? 6 : 5}
                className="px-4 py-6 text-center text-text-muted"
              >
                {t("home.explorer.empty")}
              </td>
            </tr>
          ) : (
            rows.map((row) => (
              <tr
                key={`${row.oreCode}-${row.systemCode}-${row.bodySlug}-${row.method}`}
                className="border-b border-bg-nebula-2 last:border-b-0 hover:bg-bg-nebula-2"
              >
                <td className="px-3 py-3 sm:px-4">
                  <Link
                    href={`/ores/${row.oreCode.toLowerCase()}`}
                    className="text-accent-primary hover:text-accent-glow hover:underline"
                  >
                    {row.oreName}
                  </Link>
                  <span
                    className={`ml-2 hidden text-xs sm:inline ${RARITY_TEXT_CLASS[row.rarityTier]}`}
                  >
                    {t(`ores.rarity.${row.rarityTier}`)}
                  </span>
                </td>
                <td className="px-3 py-3 sm:px-4">
                  <Link
                    href={`/locations/${row.systemCode.toLowerCase()}/${row.bodySlug}`}
                    className="text-accent-primary hover:text-accent-glow hover:underline"
                  >
                    {row.bodyName}
                  </Link>
                  <span className="ml-2 hidden text-xs text-text-muted sm:inline">
                    {t(`locations.bodyType.${row.bodyType}`)}
                  </span>
                </td>
                <td className="hidden px-4 py-3 sm:table-cell">
                  {t(`ores.method.${row.method}`)}
                </td>
                <td className="px-3 py-3 text-right font-mono text-accent-secondary sm:px-4">
                  {row.probabilityPercent}%
                </td>
                <td className="px-3 py-3 text-right font-mono sm:px-4">
                  {row.bestRefinedSell === null
                    ? "–"
                    : format.number(row.bestRefinedSell)}
                </td>
                {isAuthenticated && (
                  <td className="px-2 py-3">
                    <FavoriteButton
                      systemCode={row.systemCode}
                      bodySlug={row.bodySlug}
                      initialIsFavorite={favoriteKeys.has(
                        `${row.systemCode}|${row.bodySlug}`,
                      )}
                      isAuthenticated={isAuthenticated}
                    />
                  </td>
                )}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
