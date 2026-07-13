import { useFormatter, useTranslations } from "next-intl";
import { Badge } from "@/lib/components/ui/Badge";
import {
  DataTable,
  DataTableHead,
  DataTableRow,
  DataTableTd,
  DataTableTh,
} from "@/lib/components/ui/DataTable";
import { Panel } from "@/lib/components/ui/Panel";
import type { EquipmentPrice } from "./equipment-prices.schema";
import type { ShoppingListEntry } from "./loadout-shopping-list";

export type PurchaseEntry = ShoppingListEntry & {
  locations: EquipmentPrice[];
};

/**
 * "Wo kaufen"-Panel der Loadout-Detailseite: pro Komponente alle Kauforte
 * preissortiert (UEX-Sync), Menge, günstigste Gesamtsumme (nur wenn jedes
 * Item mindestens einen Kaufort hat) und "zuletzt synchronisiert"-Zeile.
 */
export function EquipmentPurchasePanel({
  entries,
  syncedAt,
}: {
  entries: PurchaseEntry[];
  syncedAt: string | null;
}) {
  const t = useTranslations("loadouts.purchase");
  const format = useFormatter();

  if (syncedAt === null) {
    return (
      <Panel variant="glass" className="flex flex-col gap-2 p-4">
        <h2 className="text-lg font-medium">{t("heading")}</h2>
        <p className="text-sm text-text-muted">{t("neverSynced")}</p>
      </Panel>
    );
  }

  const allHaveData = entries.every((entry) => entry.locations.length > 0);
  const cheapestTotal = entries.reduce(
    (sum, entry) => sum + (entry.locations[0]?.priceBuy ?? 0) * entry.quantity,
    0,
  );

  return (
    <Panel variant="glass" className="flex flex-col gap-4 p-4">
      <h2 className="text-lg font-medium">{t("heading")}</h2>

      {entries.map((entry) => (
        <section
          key={`${entry.kind}:${entry.code}`}
          aria-label={`${entry.name} — ${t(`kind.${entry.kind}`)}`}
          className="flex flex-col gap-2"
        >
          <div className="flex flex-wrap items-baseline gap-2">
            <h3 className="text-base font-medium">{entry.name}</h3>
            <span className="font-mono text-sm text-text-muted">
              ×{entry.quantity}
            </span>
            <Badge>{t(`kind.${entry.kind}`)}</Badge>
          </div>

          {entry.locations.length === 0 ? (
            <p className="text-sm text-text-muted">{t("noData")}</p>
          ) : (
            <DataTable>
              <DataTableHead>
                <DataTableTh>{t("locationHeader")}</DataTableTh>
                <DataTableTh>{t("terminalHeader")}</DataTableTh>
                <DataTableTh className="text-right">
                  {t("priceHeader")}
                </DataTableTh>
              </DataTableHead>
              <tbody>
                {entry.locations.map((location, index) => (
                  <DataTableRow key={`${location.terminalId}-${location.kind}`}>
                    <DataTableTd>{location.locationLabel || "—"}</DataTableTd>
                    <DataTableTd className="text-text-muted">
                      {location.terminalName}
                    </DataTableTd>
                    <DataTableTd className="text-right">
                      <span className="font-mono text-accent-secondary">
                        {format.number(location.priceBuy)}
                      </span>{" "}
                      <span className="text-xs text-text-muted">
                        {t("aUEC")}
                      </span>
                      {index === 0 && entry.locations.length > 1 && (
                        <Badge tone="success" className="ml-2">
                          {t("cheapest")}
                        </Badge>
                      )}
                    </DataTableTd>
                  </DataTableRow>
                ))}
              </tbody>
            </DataTable>
          )}
        </section>
      ))}

      <footer className="flex flex-col gap-1 border-t border-bg-nebula-2 pt-3 text-sm">
        {allHaveData && entries.length > 0 && (
          <p>
            <span className="text-text-muted">{t("cheapestTotal")}: </span>
            <span className="font-mono text-accent-secondary">
              {format.number(cheapestTotal)}
            </span>{" "}
            <span className="text-xs text-text-muted">{t("aUEC")}</span>
          </p>
        )}
        <p className="text-xs text-text-muted">
          {t("lastSynced", {
            date: format.dateTime(new Date(syncedAt), {
              dateStyle: "medium",
              timeStyle: "short",
            }),
          })}
          {" · "}
          {t("source")}
        </p>
      </footer>
    </Panel>
  );
}
