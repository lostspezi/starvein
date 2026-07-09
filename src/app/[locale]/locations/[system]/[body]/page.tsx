import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { BodyList } from "@/features/locations/BodyList";
import {
  Breadcrumbs,
  type BreadcrumbItem,
} from "@/features/locations/Breadcrumbs";
import {
  findBodyBySlug,
  findChildBodies,
  findStarSystemByCode,
} from "@/features/locations/locations.repository";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function BodyPage({
  params,
}: {
  params: Promise<{ locale: string; system: string; body: string }>;
}) {
  const { locale, system: systemParam, body: bodySlug } = await params;
  setRequestLocale(locale);

  const db = await getDb();
  const system = await findStarSystemByCode(db, systemParam.toUpperCase());
  if (!system) {
    notFound();
  }

  const body = await findBodyBySlug(db, system.code, bodySlug);
  if (!body) {
    notFound();
  }

  const t = await getTranslations("locations");
  const systemPath = `/locations/${system.code.toLowerCase()}`;

  const crumbs: BreadcrumbItem[] = [
    { label: t("title"), href: "/locations" },
    { label: system.name, href: systemPath },
  ];
  if (body.parentSlug) {
    const parent = await findBodyBySlug(db, system.code, body.parentSlug);
    if (parent) {
      crumbs.push({
        label: parent.name,
        href: `${systemPath}/${parent.slug}`,
      });
    }
  }
  crumbs.push({ label: body.name });

  const children = await findChildBodies(db, system.code, body.slug);

  return (
    <section className="mx-auto flex w-full max-w-4xl flex-col gap-4 px-6 py-8">
      <Breadcrumbs items={crumbs} />
      <div>
        <h1 className="text-2xl font-semibold">{body.name}</h1>
        <p className="text-sm text-text-muted">{t(`bodyType.${body.type}`)}</p>
      </div>
      <BodyList bodies={children} />
    </section>
  );
}
