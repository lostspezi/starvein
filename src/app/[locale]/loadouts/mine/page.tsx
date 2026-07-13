import { headers } from "next/headers";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { findAllMiningVehicles } from "@/features/loadouts/equipment.repository";
import { listLoadoutsByOwner } from "@/features/loadouts/loadouts.repository";
import { OwnerActions } from "@/features/loadouts/OwnerActions";
import { Link } from "@/i18n/navigation";
import { Badge } from "@/lib/components/ui/Badge";
import { Button } from "@/lib/components/ui/Button";
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
  return { title: t("myLoadouts.title"), robots: NO_INDEX };
}

export default async function MyLoadoutsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("loadouts");
  const userId = await getSessionUserId(await headers());

  if (!userId) {
    return (
      <PageShell>
        <PageHeader title={t("mine.title")} />
        <p className="text-text-muted">{t("mine.loginRequired")}</p>
      </PageShell>
    );
  }

  const db = await getDb();
  const [loadouts, vehicles] = await Promise.all([
    listLoadoutsByOwner(db, userId),
    findAllMiningVehicles(db),
  ]);
  const vehiclesByCode = new Map(vehicles.map((v) => [v.code, v]));

  return (
    <PageShell width="wide">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <PageHeader title={t("mine.title")} subtitle={t("mine.subtitle")} />
        <Link href="/loadouts/new">
          <Button>{t("browse.createCta")}</Button>
        </Link>
      </div>

      {loadouts.length === 0 ? (
        <p className="text-text-muted">{t("mine.empty")}</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {loadouts.map((loadout) => (
            <li
              key={loadout.id}
              className={`${panelClasses()} flex flex-wrap items-center justify-between gap-3 p-4`}
            >
              <div className="flex flex-col gap-1">
                <Link
                  href={`/loadouts/${loadout.id}`}
                  className="font-medium transition-colors duration-150 hover:text-accent-glow"
                >
                  {loadout.name}
                </Link>
                <div className="flex flex-wrap items-center gap-2 text-sm text-text-muted">
                  <span>
                    {vehiclesByCode.get(loadout.vehicleCode)?.name ??
                      loadout.vehicleCode}
                  </span>
                  <Badge tone={loadout.isPublic ? "success" : "default"}>
                    {t(loadout.isPublic ? "card.public" : "card.private")}
                  </Badge>
                  {loadout.isPublic && (
                    <span className="font-mono text-xs">
                      {t("card.votes", { count: loadout.votes.up })}
                    </span>
                  )}
                </div>
              </div>
              <OwnerActions
                loadoutId={loadout.id}
                isPublic={loadout.isPublic}
              />
            </li>
          ))}
        </ul>
      )}
    </PageShell>
  );
}
