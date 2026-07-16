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
import type { MiningVehicle } from "@/features/loadouts/equipment.schema";
import type { VehicleOffers } from "./vehicle-prices.read";
import type { OfferType, VehiclePrice } from "./vehicle-prices.schema";

/**
 * Kauf-/Miettabelle eines Fahrzeugs (preissortiert, Günstigster-Badge ab
 * zwei Angeboten). Wird von der /ships-Liste und dem Loadout-Panel geteilt.
 */
export function OfferTable({
  offerType,
  offers,
}: {
  offerType: OfferType;
  offers: VehiclePrice[];
}) {
  const t = useTranslations("ships");
  const format = useFormatter();
  const heading = t(offerType === "purchase" ? "buyHeading" : "rentHeading");

  return (
    <div className="flex flex-col gap-2">
      <h4 className="text-sm font-medium text-text-muted">{heading}</h4>
      {offers.length === 0 ? (
        <p className="text-sm text-text-muted">
          {t(offerType === "purchase" ? "noPurchase" : "noRental")}
        </p>
      ) : (
        <DataTable aria-label={heading}>
          <DataTableHead>
            <DataTableTh>{t("locationHeader")}</DataTableTh>
            <DataTableTh>{t("terminalHeader")}</DataTableTh>
            <DataTableTh className="text-right">{t("priceHeader")}</DataTableTh>
          </DataTableHead>
          <tbody>
            {offers.map((offer, index) => (
              <DataTableRow key={offer.terminalId}>
                <DataTableTd>{offer.locationLabel || "—"}</DataTableTd>
                <DataTableTd className="text-text-muted">
                  {offer.terminalName}
                </DataTableTd>
                <DataTableTd className="text-right">
                  <span className="font-mono text-accent-secondary">
                    {format.number(offer.price)}
                  </span>{" "}
                  <span className="text-xs text-text-muted">
                    {t(offerType === "purchase" ? "aUEC" : "perDay")}
                  </span>
                  {index === 0 && offers.length > 1 && (
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
    </div>
  );
}

/**
 * /ships-Liste: pro kuratiertem Mining-Fahrzeug eine Section mit Kauf- und
 * Miettabelle aus dem UEX-Sync. offerType schränkt auf einen Angebotstyp
 * ein (URL-Filter); null zeigt beide.
 */
export function VehicleOffersList({
  vehicles,
  offersByCode,
  syncedAt,
  offerType,
}: {
  vehicles: MiningVehicle[];
  offersByCode: Map<string, VehicleOffers>;
  syncedAt: string | null;
  offerType: OfferType | null;
}) {
  const t = useTranslations("ships");
  const format = useFormatter();

  if (syncedAt === null) {
    return (
      <Panel variant="glass" className="p-4">
        <p className="text-sm text-text-muted">{t("neverSynced")}</p>
      </Panel>
    );
  }

  if (vehicles.length === 0) {
    return (
      <Panel variant="glass" className="p-4">
        <p className="text-sm text-text-muted">{t("empty")}</p>
      </Panel>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {vehicles.map((vehicle) => {
        const offers = offersByCode.get(vehicle.code) ?? {
          purchase: [],
          rental: [],
        };
        return (
          <Panel
            key={vehicle.code}
            variant="glass"
            aria-label={`${vehicle.name} — ${vehicle.manufacturer}`}
            className="flex flex-col gap-3 p-4"
            role="region"
          >
            <div className="flex flex-wrap items-baseline gap-2">
              <h3 className="text-lg font-medium">{vehicle.name}</h3>
              <span className="text-sm text-text-muted">
                {vehicle.manufacturer}
              </span>
            </div>
            {offerType !== "rental" && (
              <OfferTable offerType="purchase" offers={offers.purchase} />
            )}
            {offerType !== "purchase" && (
              <OfferTable offerType="rental" offers={offers.rental} />
            )}
          </Panel>
        );
      })}

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
    </div>
  );
}
