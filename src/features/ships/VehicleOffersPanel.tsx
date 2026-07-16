import { useFormatter, useTranslations } from "next-intl";
import { Panel } from "@/lib/components/ui/Panel";
import { OfferTable } from "./VehicleOffersList";
import type { VehicleOffers } from "./vehicle-prices.read";

/**
 * "Kaufen oder mieten"-Panel der Loadout-Detailseite: Kauf- und Mietorte
 * des Loadout-Fahrzeugs aus dem UEX-Sync (dünner Wrapper um OfferTable).
 */
export function VehicleOffersPanel({
  offers,
  syncedAt,
}: {
  offers: VehicleOffers;
  syncedAt: string | null;
}) {
  const t = useTranslations("ships");
  const format = useFormatter();

  return (
    <Panel variant="glass" className="flex flex-col gap-4 p-4">
      <h2 className="text-lg font-medium">{t("panel.heading")}</h2>

      {syncedAt === null ? (
        <p className="text-sm text-text-muted">{t("neverSynced")}</p>
      ) : (
        <>
          <OfferTable offerType="purchase" offers={offers.purchase} />
          <OfferTable offerType="rental" offers={offers.rental} />

          <footer className="border-t border-bg-nebula-2 pt-3">
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
        </>
      )}
    </Panel>
  );
}
