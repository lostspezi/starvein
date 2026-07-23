import { headers } from "next/headers";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { loadEquipmentCatalog } from "@/features/loadouts/equipment.repository";
import { LoadoutCard } from "@/features/loadouts/LoadoutCard";
import { LoadoutFilters } from "@/features/loadouts/LoadoutFilters";
import { summarizeLasers } from "@/features/loadouts/loadout-summary";
import { listPublicLoadouts } from "@/features/loadouts/loadouts.repository";
import {
  LOADOUT_METHODS,
  type LoadoutMethod,
} from "@/features/loadouts/equipment.schema";
import {
  LOADOUT_SORTS,
  type LoadoutSort,
} from "@/features/loadouts/loadouts.schema";
import { bestCaseBreakableMass } from "@/features/rock-calculator/rock-break";
import { Link } from "@/i18n/navigation";
import { Button } from "@/lib/components/ui/Button";
import { PageHeader } from "@/lib/components/ui/PageHeader";
import { PageShell } from "@/lib/components/ui/PageShell";
import { getDb } from "@/lib/db";
import { CURRENT_PATCH_VERSION } from "@/lib/patch";
import { parseEnumParam } from "@/lib/search-params";
import { getSessionUserId } from "@/lib/session";
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
    path: "/loadouts",
    title: t("loadouts.title"),
    description: t("loadouts.description"),
  });
}

export default async function LoadoutsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const sp = await searchParams;
  const method = parseEnumParam<LoadoutMethod>(sp.method, LOADOUT_METHODS);
  const sort = parseEnumParam<LoadoutSort>(sp.sort, LOADOUT_SORTS) ?? "top";
  const q = typeof sp.q === "string" ? sp.q : undefined;
  const vehicleParam = typeof sp.vehicle === "string" ? sp.vehicle : undefined;

  const t = await getTranslations("loadouts");
  const db = await getDb();
  const userId = await getSessionUserId(await headers());

  const { vehicles, lasers, modules, gadgets } = await loadEquipmentCatalog(db);
  const laserNames = new Map(lasers.map((l) => [l.code, l.name]));
  const catalogIndex = {
    lasersByCode: new Map(lasers.map((l) => [l.code, l])),
    modulesByCode: new Map(modules.map((m) => [m.code, m])),
  };
  const gadgetsByCode = new Map(gadgets.map((g) => [g.code, g]));
  const vehicleCode = vehicles.some((v) => v.code === vehicleParam)
    ? vehicleParam
    : undefined;
  const loadouts = await listPublicLoadouts(db, {
    q,
    method: method ?? undefined,
    vehicleCode,
    sort,
  });

  const vehiclesByCode = new Map(vehicles.map((v) => [v.code, v]));
  const hasFilters = Boolean(q || method || vehicleCode);

  return (
    <PageShell width="wide">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <PageHeader title={t("title")} subtitle={t("subtitle")} />
        <Link href="/loadouts/new">
          <Button>{t("browse.createCta")}</Button>
        </Link>
      </div>

      <LoadoutFilters
        vehicles={vehicles.map((v) => ({ code: v.code, name: v.name }))}
      />

      {loadouts.length === 0 ? (
        <p className="text-text-muted">
          {t(hasFilters ? "browse.noResults" : "browse.empty")}
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {loadouts.map((loadout) => (
            <LoadoutCard
              key={loadout.id}
              loadout={loadout}
              vehicleName={
                vehiclesByCode.get(loadout.vehicleCode)?.name ??
                loadout.vehicleCode
              }
              laserSummary={summarizeLasers(loadout.hardpoints, laserNames)}
              currentPatchVersion={CURRENT_PATCH_VERSION}
              viewerUserId={userId}
              breakabilityMass={bestCaseBreakableMass(
                loadout,
                catalogIndex,
                gadgetsByCode,
              )}
            />
          ))}
        </div>
      )}
    </PageShell>
  );
}
