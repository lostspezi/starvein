import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { getCachedEquipmentPurchasesByCodes } from "@/features/loadouts/equipment-prices.read";
import { EquipmentPurchasePanel } from "@/features/loadouts/EquipmentPurchasePanel";
import { loadEquipmentCatalog } from "@/features/loadouts/equipment.repository";
import { HardpointBreakdown } from "@/features/loadouts/HardpointBreakdown";
import { buildShoppingList } from "@/features/loadouts/loadout-shopping-list";
import {
  aggregateHardpointStats,
  aggregateLoadoutStats,
} from "@/features/loadouts/loadout-stats";
import { getLoadoutForViewer } from "@/features/loadouts/loadouts.service";
import { OwnerActions } from "@/features/loadouts/OwnerActions";
import { VoteButton } from "@/features/loadouts/VoteButton";
import { Badge } from "@/lib/components/ui/Badge";
import { PageHeader } from "@/lib/components/ui/PageHeader";
import { PageShell } from "@/lib/components/ui/PageShell";
import { Panel } from "@/lib/components/ui/Panel";
import { getDb } from "@/lib/db";
import { CURRENT_PATCH_VERSION } from "@/lib/patch";
import { getSessionUserId } from "@/lib/session";
import { pageMetadata } from "@/lib/seo";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}): Promise<Metadata> {
  const { locale, id } = await params;
  // Nur öffentlich sichtbare Loadouts bekommen Metadata (viewer = anonym);
  // private Loadouts rendern ohnehin nur für den Owner.
  const loadout = await getLoadoutForViewer(await getDb(), id, null);
  if (!loadout) {
    return {};
  }
  return pageMetadata({
    locale,
    path: `/loadouts/${id}`,
    title: loadout.name,
  });
}

export default async function LoadoutDetailPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("loadouts");
  const db = await getDb();
  const userId = await getSessionUserId(await headers());

  const loadout = await getLoadoutForViewer(db, id, userId);
  if (!loadout) {
    notFound();
  }

  const catalog = await loadEquipmentCatalog(db);
  const vehicle = catalog.vehicles.find((v) => v.code === loadout.vehicleCode);
  const lasersByCode = new Map(catalog.lasers.map((l) => [l.code, l]));
  const modulesByCode = new Map(catalog.modules.map((m) => [m.code, m]));
  const gadgetsByCode = new Map(catalog.gadgets.map((g) => [g.code, g]));

  const hardpoints = [...loadout.hardpoints]
    .sort((a, b) => a.hardpointIndex - b.hardpointIndex)
    .flatMap((assignment) => {
      const laser = lasersByCode.get(assignment.laserCode);
      if (!laser) return [];
      const modules = assignment.moduleCodes
        .map((code) => modulesByCode.get(code))
        .filter((module) => module !== undefined);
      return [
        {
          index: assignment.hardpointIndex + 1,
          laser,
          modules,
          stats: aggregateHardpointStats(laser, modules),
        },
      ];
    });
  const totals =
    hardpoints.length > 1
      ? aggregateLoadoutStats(hardpoints.map((h) => h.stats))
      : null;
  const gadgets = loadout.gadgetCodes
    .map((code) => gadgetsByCode.get(code))
    .filter((gadget) => gadget !== undefined);

  const shoppingList = buildShoppingList(loadout, catalog);
  const purchases = await getCachedEquipmentPurchasesByCodes(
    db,
    shoppingList.map((entry) => entry.code),
  );

  const isOwner = userId !== null && userId === loadout.ownerUserId;

  return (
    <PageShell width="wide">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <PageHeader
          title={loadout.name}
          subtitle={
            <span className="flex flex-wrap items-center gap-2">
              <span>{vehicle?.name ?? loadout.vehicleCode}</span>
              <Badge>{t(`method.${loadout.method}`)}</Badge>
              {loadout.patchVersion !== CURRENT_PATCH_VERSION && (
                <Badge tone="warning">
                  {t("card.outdated", { patchVersion: loadout.patchVersion })}
                </Badge>
              )}
            </span>
          }
        />
        <div className="flex items-center gap-3">
          <VoteButton
            loadoutId={loadout.id}
            initialVotes={loadout.votes.up}
            initialHasVoted={userId !== null && loadout.voters.includes(userId)}
            isOwner={isOwner}
          />
          {isOwner && (
            <OwnerActions loadoutId={loadout.id} isPublic={loadout.isPublic} />
          )}
        </div>
      </div>

      {loadout.description && (
        <p className="text-text-muted">{loadout.description}</p>
      )}

      {hardpoints.map((hardpoint) => (
        <Panel key={hardpoint.index} className="p-4">
          <HardpointBreakdown
            index={hardpoint.index}
            laser={hardpoint.laser}
            modules={hardpoint.modules}
            stats={hardpoint.stats}
          />
        </Panel>
      ))}

      {totals && (
        <Panel variant="glass" className="flex flex-col gap-2 p-4">
          <h2 className="text-base font-medium">{t("detail.totalsHeading")}</h2>
          <dl className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
            <div>
              <dt className="text-text-muted">{t("stats.laserPower")}</dt>
              <dd className="font-mono text-accent-secondary">
                {Math.round(totals.totalLaserPower)}
              </dd>
            </div>
            <div>
              <dt className="text-text-muted">
                {t("stats.extractionLaserPower")}
              </dt>
              <dd className="font-mono text-accent-secondary">
                {Math.round(totals.totalExtractionLaserPower)}
              </dd>
            </div>
            <div>
              <dt className="text-text-muted">{t("stats.optimalRange")}</dt>
              <dd className="font-mono text-accent-secondary">
                {totals.minOptimalRange} m
              </dd>
            </div>
            <div>
              <dt className="text-text-muted">{t("stats.maxRange")}</dt>
              <dd className="font-mono text-accent-secondary">
                {totals.maxRange} m
              </dd>
            </div>
          </dl>
        </Panel>
      )}

      {gadgets.length > 0 && (
        <Panel variant="glass" className="flex flex-col gap-2 p-4">
          <h2 className="text-base font-medium">
            {t("detail.gadgetsHeading")}
          </h2>
          <div className="flex flex-wrap gap-2">
            {gadgets.map((gadget) => (
              <Badge key={gadget.code}>{gadget.name}</Badge>
            ))}
          </div>
        </Panel>
      )}

      {shoppingList.length > 0 && (
        <EquipmentPurchasePanel
          entries={shoppingList.map((entry) => ({
            ...entry,
            locations: purchases.byCode.get(entry.code) ?? [],
          }))}
          syncedAt={purchases.syncedAt}
        />
      )}
    </PageShell>
  );
}
