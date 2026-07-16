"use client";

import { useTranslations } from "next-intl";
import { parseAsString, parseAsStringLiteral, useQueryState } from "nuqs";
import { useId } from "react";
import { FilterGroup } from "@/lib/components/FilterGroup";
import { OFFER_TYPES } from "./vehicle-prices.schema";

/** Fahrzeug- und Angebotstyp-Filter der /ships-Seite (URL-State). */
export function ShipFilters({
  vehicles,
}: {
  vehicles: { code: string; name: string }[];
}) {
  const t = useTranslations("ships");
  const vehicleSelectId = useId();
  // shallow: false, damit die Server-Komponente mit neuen searchParams rendert
  const [vehicle, setVehicle] = useQueryState(
    "vehicle",
    parseAsString.withOptions({ shallow: false }),
  );
  const [offer, setOffer] = useQueryState(
    "offer",
    parseAsStringLiteral(OFFER_TYPES).withOptions({ shallow: false }),
  );

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
      <div className="flex flex-wrap items-center gap-3">
        <label htmlFor={vehicleSelectId} className="sr-only">
          {t("filter.vehicleLabel")}
        </label>
        <select
          id={vehicleSelectId}
          value={vehicle ?? ""}
          onChange={(event) => setVehicle(event.target.value || null)}
          className="rounded border border-bg-nebula-2 bg-bg-void px-2 py-1 text-sm focus:border-accent-primary focus:outline-none"
        >
          <option value="">{t("filter.vehicleAll")}</option>
          {vehicles.map((v) => (
            <option key={v.code} value={v.code}>
              {v.name}
            </option>
          ))}
        </select>
      </div>
      <FilterGroup
        label={t("filter.offerTypeLabel")}
        options={OFFER_TYPES}
        value={offer}
        onChange={setOffer}
        optionLabel={(option) => t(`offerType.${option}`)}
        allLabel={t("offerType.all")}
      />
    </div>
  );
}
