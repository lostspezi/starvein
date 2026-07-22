import { useFormatter, useTranslations } from "next-intl";
import { FavoriteButton } from "@/features/favorites/FavoriteButton";
import { SignatureExpandRow } from "@/features/signature-profiles/SignatureExpandRow";
import {
  DataTable,
  DataTableHead,
  DataTableTd,
  DataTableTh,
} from "@/lib/components/ui/DataTable";
import {
  DepositBadge,
  toDepositPanelData,
} from "@/features/ore-occurrences/OccurrenceBadges";
import { GlowLink } from "@/lib/components/ui/GlowLink";
import { RARITY_TEXT_CLASS } from "@/lib/rarity";
import type { ExplorerRow } from "./explorer.service";

function formatSignature(row: ExplorerRow): string {
  if (row.signatureValue !== undefined) return String(row.signatureValue);
  if (row.signatureRange)
    return `${row.signatureRange.min}–${row.signatureRange.max}`;
  return "—";
}

/**
 * Explorer-Tabelle der Startseite: alle Vorkommen mit Erz, Location,
 * Methode, Wahrscheinlichkeit, Signatur, roh/raffiniert-Verkaufspreis und
 * Favoriten-Stern (nur eingeloggt). Jede Zeile klappt den vollen 1×–4×-
 * Cluster + Preise auf. favoriteKeys: "SYSTEM|slug".
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

  const formatSell = (price: number | null) =>
    price === null ? "–" : format.number(price);

  // Ore + Location + Method + Signature + Probability + Raw + Refined (+ Favorite) + Chevron
  const colSpan = isAuthenticated ? 9 : 8;

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
          <DataTableTh className="hidden sm:table-cell">
            {t("occurrences.table.signature")}
          </DataTableTh>
          <DataTableTh className="px-3 text-right sm:px-4">
            {t("occurrences.table.probability")}
          </DataTableTh>
          <DataTableTh className="hidden px-3 text-right sm:px-4 md:table-cell">
            {t("occurrences.table.sellRaw")}
          </DataTableTh>
          <DataTableTh className="px-3 text-right sm:px-4">
            {t("occurrences.table.sellRefined")}
          </DataTableTh>
          {isAuthenticated && <DataTableTh className="px-2" />}
          <DataTableTh className="w-8" />
        </DataTableHead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td
                colSpan={colSpan}
                className="px-4 py-6 text-center text-text-muted"
              >
                {t("home.explorer.empty")}
              </td>
            </tr>
          ) : (
            rows.map((row) => (
              <SignatureExpandRow
                key={`${row.oreCode}-${row.systemCode}-${row.bodySlug}-${row.method}`}
                colSpan={colSpan}
                expandLabel={t("occurrences.table.expand")}
                collapseLabel={t("occurrences.table.collapse")}
                panels={[
                  {
                    method: row.method,
                    signatureValue: row.signatureValue,
                    signatureRange: row.signatureRange,
                    deposit: toDepositPanelData(row),
                  },
                ]}
                rawSell={row.bestRawSell}
                refinedSell={row.bestRefinedSell}
                summary={
                  <>
                    <DataTableTd className="px-3 sm:px-4">
                      <GlowLink href={`/ores/${row.oreCode.toLowerCase()}`}>
                        {row.oreName}
                      </GlowLink>
                      <span
                        className={`ml-2 hidden text-xs sm:inline ${RARITY_TEXT_CLASS[row.rarityTier]}`}
                      >
                        {t(`ores.rarity.${row.rarityTier}`)}
                      </span>{" "}
                      {/* Leerraum = Soft-Wrap-Punkt (siehe OreOccurrencesTable) */}
                      <span className="ml-1">
                        <DepositBadge depositType={row.depositType} />
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
                    <DataTableTd className="hidden sm:table-cell">
                      <span
                        className={`font-mono ${
                          row.method === "ship"
                            ? "text-accent-secondary"
                            : "text-text-muted"
                        }`}
                      >
                        {formatSignature(row)}
                      </span>
                    </DataTableTd>
                    <DataTableTd className="px-3 text-right font-mono text-accent-secondary sm:px-4">
                      {row.probabilityPercent}%
                    </DataTableTd>
                    <DataTableTd className="hidden px-3 text-right font-mono sm:px-4 md:table-cell">
                      {formatSell(row.bestRawSell)}
                    </DataTableTd>
                    <DataTableTd className="px-3 text-right font-mono sm:px-4">
                      {formatSell(row.bestRefinedSell)}
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
                  </>
                }
              />
            ))
          )}
        </tbody>
      </DataTable>
    </>
  );
}
