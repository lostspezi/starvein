import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { FavoriteButton } from "@/features/favorites/FavoriteButton";
import { isFavorite } from "@/features/favorites/favorites.repository";
import { getSessionUserId } from "@/lib/session";
import { LocationOccurrencesTable } from "@/features/ore-occurrences/LocationOccurrencesTable";
import { MethodFilter } from "@/features/ore-occurrences/MethodFilter";
import { findOccurrencesWithInheritance } from "@/features/ore-occurrences/ore-occurrences.service";
import { MINING_METHODS, type MiningMethod } from "@/features/ores/ores.schema";
import { parseEnumParam } from "@/lib/search-params";
import { BodyList } from "@/features/locations/BodyList";
import { Breadcrumbs, type BreadcrumbItem } from "@/lib/components/Breadcrumbs";
import {
  findBodyBySlug,
  findChildBodies,
  findStarSystemByCode,
} from "@/features/locations/locations.repository";
import { PageShell } from "@/lib/components/ui/PageShell";
import { getDb } from "@/lib/db";
import { pageMetadata } from "@/lib/seo";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; system: string; body: string }>;
}): Promise<Metadata> {
  const { locale, system: systemParam, body: bodySlug } = await params;
  const db = await getDb();
  const system = await findStarSystemByCode(db, systemParam.toUpperCase());
  if (!system) {
    return {};
  }
  const body = await findBodyBySlug(db, system.code, bodySlug);
  if (!body) {
    return {};
  }
  const t = await getTranslations({ locale, namespace: "meta" });
  return pageMetadata({
    locale,
    path: `/locations/${system.code.toLowerCase()}/${body.slug}`,
    title: body.name,
    description: t("body.description", {
      body: body.name,
      system: system.name,
    }),
    ownOgImage: true,
  });
}

export default async function BodyPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; system: string; body: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
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

  const t = await getTranslations();
  const systemPath = `/locations/${system.code.toLowerCase()}`;

  // Ahnenkette hochlaufen (z. B. Outpost -> Mond -> Planet), Tiefe begrenzt
  const ancestors: BreadcrumbItem[] = [];
  let parentSlug = body.parentSlug;
  for (let depth = 0; parentSlug && depth < 5; depth++) {
    const parent = await findBodyBySlug(db, system.code, parentSlug);
    if (!parent) break;
    ancestors.unshift({
      label: parent.name,
      href: `${systemPath}/${parent.slug}`,
    });
    parentSlug = parent.parentSlug;
  }

  const crumbs: BreadcrumbItem[] = [
    { label: t("locations.title"), href: "/locations" },
    { label: system.name, href: systemPath },
    ...ancestors,
    { label: body.name },
  ];

  const children = await findChildBodies(db, system.code, body.slug);

  const sp = await searchParams;
  const method = parseEnumParam<MiningMethod>(sp.method, MINING_METHODS);
  // Outposts/Höhlen haben keine eigenen Vorkommen — Roll-up vom Parent-Body
  const { occurrences, inheritedFrom } = await findOccurrencesWithInheritance(
    db,
    system.code,
    body,
    method,
  );

  const userId = await getSessionUserId(await headers());
  const favorited = userId
    ? await isFavorite(db, userId, system.code, body.slug)
    : false;

  return (
    <PageShell width="wide">
      <Breadcrumbs locale={locale} items={crumbs} />
      <div className="animate-reveal">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-semibold">{body.name}</h1>
          <FavoriteButton
            systemCode={system.code}
            bodySlug={body.slug}
            initialIsFavorite={favorited}
            isAuthenticated={userId !== null}
          />
        </div>
        <p className="text-sm text-text-muted">
          {t(`locations.bodyType.${body.type}`)}
        </p>
      </div>

      <h2 className="text-lg font-medium">{t("occurrences.atLocation")}</h2>
      <MethodFilter />
      {inheritedFrom && (
        <p className="text-sm text-text-muted">
          {t("occurrences.inheritedFrom", { name: inheritedFrom.name })}
        </p>
      )}
      <LocationOccurrencesTable occurrences={occurrences} />
      <p className="text-xs text-text-muted">{t("occurrences.disclaimer")}</p>

      {children.length > 0 && (
        <>
          <h2 className="text-lg font-medium">{t("locations.title")}</h2>
          <BodyList bodies={children} />
        </>
      )}
    </PageShell>
  );
}
