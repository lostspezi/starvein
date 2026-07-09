import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { BodyList } from "@/features/locations/BodyList";
import { Breadcrumbs } from "@/features/locations/Breadcrumbs";
import {
  findBodiesBySystem,
  findStarSystemByCode,
} from "@/features/locations/locations.repository";
import { BODY_TYPES } from "@/features/locations/locations.schema";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

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
    <section className="mx-auto flex w-full max-w-4xl flex-col gap-4 px-4 py-6 sm:px-6 sm:py-8">
      <Breadcrumbs
        items={[
          { label: t("title"), href: "/locations" },
          { label: system.name },
        ]}
      />
      <h1 className="text-2xl font-semibold">{system.name}</h1>
      {groups.map((group) => (
        <div key={group.type} className="flex flex-col gap-3">
          <h2 className="text-lg font-medium">{t(`groups.${group.type}`)}</h2>
          <BodyList bodies={group.bodies} />
        </div>
      ))}
    </section>
  );
}
