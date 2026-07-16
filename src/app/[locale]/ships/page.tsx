import { getTranslations, setRequestLocale } from "next-intl/server";
import { findAllMiningVehicles } from "@/features/loadouts/equipment.repository";
import { ShipFilters } from "@/features/ships/ShipFilters";
import { VehicleOffersList } from "@/features/ships/VehicleOffersList";
import { getCachedVehicleOffersByCodes } from "@/features/ships/vehicle-prices.read";
import {
  OFFER_TYPES,
  type OfferType,
} from "@/features/ships/vehicle-prices.schema";
import { PageHeader } from "@/lib/components/ui/PageHeader";
import { PageShell } from "@/lib/components/ui/PageShell";
import { getDb } from "@/lib/db";
import { parseEnumParam } from "@/lib/search-params";
import { pageMetadata } from "@/lib/seo";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "meta" });
  return pageMetadata({
    locale,
    path: "/ships",
    title: t("ships.title"),
    description: t("ships.description"),
  });
}

export default async function ShipsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("ships");
  const db = await getDb();
  const allVehicles = await findAllMiningVehicles(db);

  const vehicleCodes = allVehicles.map((vehicle) => vehicle.code);
  const sp = await searchParams;
  const vehicleFilter = parseEnumParam(sp.vehicle, vehicleCodes);
  const offerType = parseEnumParam<OfferType>(sp.offer, OFFER_TYPES);

  const vehicles = vehicleFilter
    ? allVehicles.filter((vehicle) => vehicle.code === vehicleFilter)
    : allVehicles;
  const { byCode, syncedAt } = await getCachedVehicleOffersByCodes(
    db,
    vehicles.map((vehicle) => vehicle.code),
  );

  return (
    <PageShell width="wide">
      <PageHeader title={t("title")} subtitle={t("subtitle")} />
      <ShipFilters
        vehicles={allVehicles.map(({ code, name }) => ({ code, name }))}
      />
      <VehicleOffersList
        vehicles={vehicles}
        offersByCode={byCode}
        syncedAt={syncedAt}
        offerType={offerType}
      />
    </PageShell>
  );
}
