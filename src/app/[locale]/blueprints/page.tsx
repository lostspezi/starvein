import { headers } from "next/headers";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { BlueprintFilters } from "@/features/blueprints/BlueprintFilters";
import { BlueprintList } from "@/features/blueprints/BlueprintList";
import { BlueprintPagination } from "@/features/blueprints/BlueprintPagination";
import { paginate, parsePageParam } from "@/features/blueprints/paginate";
import { listCollectedBlueprintKeys } from "@/features/blueprints/blueprint-collection.repository";
import { filterBlueprints } from "@/features/blueprints/blueprints.filter";
import { findAllBlueprints } from "@/features/blueprints/blueprints.repository";
import {
  BLUEPRINT_CATEGORIES,
  type BlueprintCategory,
} from "@/features/blueprints/blueprints.schema";
import { findAllMaterials } from "@/features/blueprints/materials.repository";
import { PageHeader } from "@/lib/components/ui/PageHeader";
import { PageShell } from "@/lib/components/ui/PageShell";
import { getDb } from "@/lib/db";
import { parseEnumParam } from "@/lib/search-params";
import { pageMetadata } from "@/lib/seo";
import { getSessionUserId } from "@/lib/session";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "blueprints" });
  return pageMetadata({
    locale,
    path: "/blueprints",
    title: t("title"),
    description: t("subtitle"),
  });
}

export default async function BlueprintsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const sp = await searchParams;
  const category = parseEnumParam<BlueprintCategory>(
    sp.category,
    BLUEPRINT_CATEGORIES,
  );
  const material = typeof sp.material === "string" ? sp.material : null;
  const q = typeof sp.q === "string" ? sp.q : null;
  const collectedOnly = sp.collected === "1";

  const db = await getDb();
  const t = await getTranslations("blueprints");
  const userId = await getSessionUserId(await headers());
  const [allBlueprints, materials, collectedKeys] = await Promise.all([
    findAllBlueprints(db),
    findAllMaterials(db),
    userId ? listCollectedBlueprintKeys(db, userId) : null,
  ]);

  const filtered = filterBlueprints(allBlueprints, {
    category,
    materialCode: material,
    q,
    // Der Sammlungs-Filter gilt nur für angemeldete Nutzer.
    onlyKeys: collectedOnly && collectedKeys ? collectedKeys : null,
  });
  // ~1560 Blueprints ungeteilt wären ~2,9 MB HTML — daher Seitenaufteilung.
  const page = paginate(filtered, parsePageParam(sp.page));

  const gameVersion = allBlueprints[0]?.gameVersion;

  return (
    <PageShell width="wide">
      <PageHeader title={t("title")} subtitle={t("subtitle")} />
      <BlueprintFilters
        materials={materials.map((m) => ({ code: m.code, name: m.name }))}
        isAuthenticated={userId !== null}
      />
      <BlueprintPagination
        page={page.page}
        totalPages={page.totalPages}
        total={page.total}
      />
      <BlueprintList
        blueprints={page.items}
        collectedKeys={collectedKeys ?? undefined}
      />
      <BlueprintPagination
        page={page.page}
        totalPages={page.totalPages}
        total={page.total}
      />
      {gameVersion && (
        <p className="text-xs text-text-muted">
          {t("source.attribution", { version: gameVersion })}
        </p>
      )}
    </PageShell>
  );
}
