import { headers } from "next/headers";
import { getTranslations, setRequestLocale } from "next-intl/server";
import {
  findAllCelestialBodies,
  findAllStarSystems,
} from "@/features/locations/locations.repository";
import { findAllOres } from "@/features/ores/ores.repository";
import { listRefineryTerminals } from "@/features/refinery-and-prices/refinery-catalog";
import { listWarehouseEntriesByOwner } from "@/features/warehouse/warehouse.repository";
import { groupWarehouseEntries } from "@/features/warehouse/warehouse.schema";
import { WarehouseEntryActions } from "@/features/warehouse/WarehouseEntryActions";
import { WarehouseEntryForm } from "@/features/warehouse/WarehouseEntryForm";
import { Badge } from "@/lib/components/ui/Badge";
import { PageHeader } from "@/lib/components/ui/PageHeader";
import { PageShell } from "@/lib/components/ui/PageShell";
import { panelClasses } from "@/lib/components/ui/Panel";
import { getDb } from "@/lib/db";
import { getSessionUserId } from "@/lib/session";
import { NO_INDEX } from "@/lib/seo";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "meta" });
  return { title: t("myWarehouse.title"), robots: NO_INDEX };
}

export default async function WarehousePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("warehouse");
  const userId = await getSessionUserId(await headers());

  if (!userId) {
    return (
      <PageShell>
        <PageHeader title={t("title")} />
        <p className="text-text-muted">{t("loginRequired")}</p>
      </PageShell>
    );
  }

  const db = await getDb();
  const [entries, ores, systems, bodies, terminals] = await Promise.all([
    listWarehouseEntriesByOwner(db, userId),
    findAllOres(db),
    findAllStarSystems(db),
    findAllCelestialBodies(db),
    listRefineryTerminals(db),
  ]);
  const oreNames = new Map(ores.map((ore) => [ore.code, ore.name_en]));
  const groups = groupWarehouseEntries(entries);

  return (
    <PageShell width="wide">
      <PageHeader title={t("title")} subtitle={t("subtitle")} />

      <WarehouseEntryForm
        ores={ores.map((ore) => ({ code: ore.code, name: ore.name_en }))}
        systems={systems.map((system) => ({
          code: system.code,
          name: system.name,
        }))}
        bodies={bodies.map((body) => ({
          systemCode: body.systemCode,
          slug: body.slug,
          name: body.name,
        }))}
        terminals={terminals.map((terminal) => ({
          terminalId: terminal.terminalId,
          terminalName: terminal.terminalName,
        }))}
      />

      {groups.length === 0 ? (
        <p className="text-text-muted">{t("empty")}</p>
      ) : (
        <div className="flex flex-col gap-4">
          {groups.map((group) => (
            <section key={group.key} className={`${panelClasses()} p-4`}>
              <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="text-base font-medium">{group.label}</h2>
                <span className="font-mono text-sm text-text-muted">
                  {t("group.totalScu", { count: group.totalScu })}
                </span>
              </div>
              <ul className="flex flex-col gap-3">
                {group.entries.map((entry) => (
                  <li
                    key={entry.id}
                    className="flex flex-wrap items-center justify-between gap-3 border-t border-bg-nebula-2 pt-3 first:border-t-0 first:pt-0"
                  >
                    <div className="flex flex-col gap-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium">
                          {oreNames.get(entry.oreCode) ?? entry.oreCode}
                        </span>
                        <Badge
                          tone={
                            entry.kind === "refined" ? "success" : "default"
                          }
                        >
                          {t(`entry.${entry.kind}`)}
                        </Badge>
                        <span className="font-mono text-sm text-accent-secondary">
                          {entry.quantityScu} SCU
                        </span>
                        {entry.qualityRating != null && (
                          <span className="font-mono text-sm text-accent-cyan">
                            {t("entry.qualityValue", {
                              value: entry.qualityRating,
                            })}
                          </span>
                        )}
                      </div>
                      {entry.note && (
                        <p className="text-sm text-text-muted">{entry.note}</p>
                      )}
                    </div>
                    <WarehouseEntryActions
                      entryId={entry.id}
                      quantityScu={entry.quantityScu}
                      qualityRating={entry.qualityRating}
                      note={entry.note ?? ""}
                      systems={systems.map((system) => ({
                        code: system.code,
                        name: system.name,
                      }))}
                      bodies={bodies.map((body) => ({
                        systemCode: body.systemCode,
                        slug: body.slug,
                        name: body.name,
                      }))}
                      terminals={terminals.map((terminal) => ({
                        terminalId: terminal.terminalId,
                        terminalName: terminal.terminalName,
                      }))}
                    />
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </PageShell>
  );
}
