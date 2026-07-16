import { useFormatter, useTranslations } from "next-intl";
import { FavoriteButton } from "@/features/favorites/FavoriteButton";
import {
  DataTable,
  DataTableHead,
  DataTableRow,
  DataTableTd,
  DataTableTh,
} from "@/lib/components/ui/DataTable";
import { GlowLink } from "@/lib/components/ui/GlowLink";
import { RARITY_TEXT_CLASS } from "@/lib/rarity";
import type { ExplorerRow } from "./explorer.service";

/**
 * Explorer-Tabelle der Startseite: alle Vorkommen mit Erz, Location,
 * Methode, Wahrscheinlichkeit, bestem Refined-Verkaufspreis und
 * Favoriten-Stern (nur eingeloggt). favoriteKeys: "SYSTEM|slug".
 */
export function ExplorerTable({
  rows,
  total,
  favoriteKeys,
  isAuthenticated,
}: {
  rows: ExplorerRow[];
  /** Gesamtzahl vor dem Render-Cap — zeigt den "Top X von Y"-Hinweis. */
  total?: number;
  favoriteKeys: Set<string>;
  isAuthenticated: boolean;
}) {
  const t = useTranslations();
  const format = useFormatter();

  return (
    <>
      {total !== undefined && total > rows.length && (
        <p className="text-sm text-text-muted">
          {t("home.explorer.truncated", { shown: rows.length, total })}
        </p>
      )}
      <DataTable>
        <DataTableHead>
          <DataTableTh className="px-3 sm:px-4">
            {t("occurrences.table.ore")}
          </DataTableTh>
          <DataTableTh className="px-3 sm:px-4">
            {t("occurrences.table.location")}
          </DataTableTh>
          <DataTableTh className="hidden sm:table-cell">
            {t("occurrences.table.method")}
          </DataTableTh>
          <DataTableTh className="px-3 text-right sm:px-4">
            {t("occurrences.table.probability")}
          </DataTableTh>
          <DataTableTh className="px-3 text-right sm:px-4">
            {t("home.explorer.priceHeader")}
          </DataTableTh>
          {isAuthenticated && <DataTableTh className="px-2" />}
        </DataTableHead>
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
              <DataTableRow
                key={`${row.oreCode}-${row.systemCode}-${row.bodySlug}-${row.method}`}
              >
                <DataTableTd className="px-3 sm:px-4">
                  <GlowLink href={`/ores/${row.oreCode.toLowerCase()}`}>
                    {row.oreName}
                  </GlowLink>
                  <span
                    className={`ml-2 hidden text-xs sm:inline ${RARITY_TEXT_CLASS[row.rarityTier]}`}
                  >
                    {t(`ores.rarity.${row.rarityTier}`)}
                  </span>
                </DataTableTd>
                <DataTableTd className="px-3 sm:px-4">
                  <GlowLink
                    href={`/locations/${row.systemCode.toLowerCase()}/${row.bodySlug}`}
                  >
                    {row.bodyName}
                  </GlowLink>
                  <span className="ml-2 hidden text-xs text-text-muted sm:inline">
                    {t(`locations.bodyType.${row.bodyType}`)}
                  </span>
                </DataTableTd>
                <DataTableTd className="hidden sm:table-cell">
                  {t(`ores.method.${row.method}`)}
                </DataTableTd>
                <DataTableTd className="px-3 text-right font-mono text-accent-secondary sm:px-4">
                  {row.probabilityPercent}%
                </DataTableTd>
                <DataTableTd className="px-3 text-right font-mono sm:px-4">
                  {row.bestRefinedSell === null
                    ? "–"
                    : format.number(row.bestRefinedSell)}
                </DataTableTd>
                {isAuthenticated && (
                  <DataTableTd className="px-2">
                    <FavoriteButton
                      systemCode={row.systemCode}
                      bodySlug={row.bodySlug}
                      initialIsFavorite={favoriteKeys.has(
                        `${row.systemCode}|${row.bodySlug}`,
                      )}
                      isAuthenticated={isAuthenticated}
                    />
                  </DataTableTd>
                )}
              </DataTableRow>
            ))
          )}
        </tbody>
      </DataTable>
    </>
  );
}
