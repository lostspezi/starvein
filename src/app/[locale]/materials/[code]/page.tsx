import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { MaterialBlueprintsPanel } from "@/features/blueprints/MaterialBlueprintsPanel";
import { findBlueprintsByMaterialCode } from "@/features/blueprints/blueprints.repository";
import { findMaterialByCode } from "@/features/blueprints/materials.repository";
import { Breadcrumbs } from "@/lib/components/Breadcrumbs";
import { GlowLink } from "@/lib/components/ui/GlowLink";
import { PageHeader } from "@/lib/components/ui/PageHeader";
import { PageShell } from "@/lib/components/ui/PageShell";
import { Panel } from "@/lib/components/ui/Panel";
import { getDb } from "@/lib/db";
import { pageMetadata } from "@/lib/seo";
import type { Metadata } from "next";

// ISR: on-demand gerendert und 1h gecacht; der Wiki-Sync stößt per
// revalidatePath einen früheren Refresh an.
export const revalidate = 3600;

// Leer: nichts wird beim Build prerendert (kein Mongo im Docker-Builder),
// Pfade entstehen on-demand und werden dann gemaess revalidate gecacht.
export function generateStaticParams() {
  return [];
}

/** Erze speisen fast das gesamte Crafting — die Liste wird gedeckelt. */
const PREVIEW_LIMIT = 25;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; code: string }>;
}): Promise<Metadata> {
  const { locale, code } = await params;
  const material = await findMaterialByCode(await getDb(), code.toUpperCase());
  if (!material) {
    return {};
  }
  return pageMetadata({
    locale,
    path: `/materials/${material.code.toLowerCase()}`,
    title: material.name,
    description: material.name,
  });
}

export default async function MaterialDetailPage({
  params,
}: {
  params: Promise<{ locale: string; code: string }>;
}) {
  const { locale, code } = await params;
  setRequestLocale(locale);

  const db = await getDb();
  const material = await findMaterialByCode(db, code.toUpperCase());
  if (!material) {
    notFound();
  }

  const t = await getTranslations("materials");
  const tBlueprints = await getTranslations("blueprints");
  const tNav = await getTranslations("common.nav");
  const blueprints = await findBlueprintsByMaterialCode(db, material.code);

  return (
    <PageShell width="wide">
      <Breadcrumbs
        locale={locale}
        items={[
          { label: tNav("materials"), href: "/materials" },
          { label: material.name },
        ]}
      />
      <PageHeader
        title={
          <>
            {material.name}{" "}
            <span className="font-mono text-base text-text-muted">
              {material.code}
            </span>
          </>
        }
        subtitle={
          <GlowLink href="/materials">{t("detail.backToList")}</GlowLink>
        }
      />

      <Panel className="p-4">
        <dl className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div>
            <dt className="text-xs text-text-muted">{t("detail.kindLabel")}</dt>
            <dd>{t(`kind.${material.kind}`)}</dd>
          </div>
          <div>
            <dt className="text-xs text-text-muted">{t("detail.oreLabel")}</dt>
            <dd>
              {material.oreCode ? (
                <GlowLink href={`/ores/${material.oreCode.toLowerCase()}`}>
                  {material.oreCode}
                </GlowLink>
              ) : (
                <span className="text-text-muted">{t("detail.none")}</span>
              )}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-text-muted">
              {t("detail.usedInLabel")}
            </dt>
            <dd className="font-mono text-accent-secondary">
              {t("detail.usedInCount", { count: blueprints.length })}
            </dd>
          </div>
        </dl>
      </Panel>

      <MaterialBlueprintsPanel
        blueprints={blueprints.slice(0, PREVIEW_LIMIT)}
        totalCount={blueprints.length}
        materialCode={material.code}
      />

      <p className="text-xs text-text-muted">
        {tBlueprints("source.attribution", { version: material.gameVersion })}
      </p>
    </PageShell>
  );
}
