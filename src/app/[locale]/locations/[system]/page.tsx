import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { BodyList } from "@/features/locations/BodyList";
import { Breadcrumbs } from "@/features/locations/Breadcrumbs";
import {
  findBodiesBySystem,
  findStarSystemByCode,
} from "@/features/locations/locations.repository";
import { BODY_TYPES } from "@/features/locations/locations.schema";
import { PageHeader } from "@/lib/components/ui/PageHeader";
import { PageShell } from "@/lib/components/ui/PageShell";
import { getDb } from "@/lib/db";
import { pageMetadata } from "@/lib/seo";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; system: string }>;
}): Promise<Metadata> {
  const { locale, system: systemParam } = await params;
  const system = await findStarSystemByCode(
    await getDb(),
    systemParam.toUpperCase(),
  );
  if (!system) {
    return {};
  }
  const t = await getTranslations({ locale, namespace: "meta" });
  return pageMetadata({
    locale,
    path: `/locations/${system.code.toLowerCase()}`,
    title: system.name,
    description: t("system.description", { system: system.name }),
  });
}

export default async function SystemPage({
  params,
}: {
  params: Promise<{ locale: string; system: string }>;
}) {
  const { locale, system: systemParam } = await params;
  setRequestLocale(locale);

  const db = await getDb();
  const system = await findStarSystemByCode(db, systemParam.toUpperCase());
  if (!system) {
    notFound();
  }

  const t = await getTranslations("locations");
  const bodies = await findBodiesBySystem(db, system.code);
  const topLevel = bodies.filter((body) => body.parentSlug === null);

  // Nach Typ gruppieren (Planeten zuerst), leere Gruppen ausblenden
  const groups = BODY_TYPES.map((type) => ({
    type,
    bodies: topLevel.filter((body) => body.type === type),
  })).filter((group) => group.bodies.length > 0);

  return (
    <PageShell>
      <Breadcrumbs
        items={[
          { label: t("title"), href: "/locations" },
          { label: system.name },
        ]}
      />
      <PageHeader title={system.name} />
      {groups.map((group) => (
        <div key={group.type} className="flex flex-col gap-3">
          <h2 className="text-lg font-medium">{t(`groups.${group.type}`)}</h2>
          <BodyList bodies={group.bodies} />
        </div>
      ))}
    </PageShell>
  );
}
