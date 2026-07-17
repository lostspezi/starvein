import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { BlueprintComponentsTable } from "@/features/blueprints/BlueprintComponentsTable";
import { CollectBlueprintButton } from "@/features/blueprints/CollectBlueprintButton";
import { findBlueprintBySlug } from "@/features/blueprints/blueprints.repository";
import { findAllMaterials } from "@/features/blueprints/materials.repository";
import type { Material } from "@/features/blueprints/materials.schema";
import { Breadcrumbs } from "@/lib/components/Breadcrumbs";
import { GlowLink } from "@/lib/components/ui/GlowLink";
import { PageHeader } from "@/lib/components/ui/PageHeader";
import { PageShell } from "@/lib/components/ui/PageShell";
import { Panel } from "@/lib/components/ui/Panel";
import { getDb } from "@/lib/db";
import { pageMetadata } from "@/lib/seo";
import type { Metadata } from "next";

// ISR: on-demand gerendert und 1h gecacht; der Wiki-Sync stößt per
// revalidatePath einen früheren Refresh an. Der Sammel-State kommt
// clientseitig (self-managed CollectBlueprintButton).
export const revalidate = 3600;

// Leer: nichts wird beim Build prerendert (kein Mongo im Docker-Builder),
// Pfade entstehen on-demand und werden dann gemaess revalidate gecacht.
export function generateStaticParams() {
  return [];
}

/** Wiki liefert Sekunden; für die Anzeige in Minuten aufrunden. */
function craftMinutes(seconds: number): number {
  return Math.round(seconds / 60);
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  const blueprint = await findBlueprintBySlug(
    await getDb(),
    slug.toLowerCase(),
  );
  if (!blueprint) {
    return {};
  }
  return pageMetadata({
    locale,
    path: `/blueprints/${blueprint.slug}`,
    title: blueprint.outputName,
    description: blueprint.outputName,
  });
}

export default async function BlueprintDetailPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  setRequestLocale(locale);

  const db = await getDb();
  const blueprint = await findBlueprintBySlug(db, slug.toLowerCase());
  if (!blueprint) {
    notFound();
  }

  const t = await getTranslations("blueprints");
  const tNav = await getTranslations("common.nav");
  const materials = await findAllMaterials(db);
  const materialsByCode: Record<string, Material> = Object.fromEntries(
    materials.map((m) => [m.code, m]),
  );

  return (
    <PageShell>
      <Breadcrumbs
        locale={locale}
        items={[
          { label: tNav("blueprints"), href: "/blueprints" },
          { label: blueprint.outputName },
        ]}
      />
      <PageHeader
        title={
          <span className="inline-flex items-center gap-2">
            {blueprint.outputName}
            <CollectBlueprintButton blueprintKey={blueprint.key} />
          </span>
        }
        subtitle={
          <span className="flex flex-col gap-1">
            <span className="font-mono text-xs">{blueprint.key}</span>
            <GlowLink href="/blueprints">{t("detail.backToList")}</GlowLink>
          </span>
        }
      />

      <Panel className="p-4">
        <dl className="grid grid-cols-1 gap-3 sm:grid-cols-4">
          <div>
            <dt className="text-xs text-text-muted">
              {t("detail.categoryLabel")}
            </dt>
            <dd>{t(`category.${blueprint.category}`)}</dd>
          </div>
          <div>
            <dt className="text-xs text-text-muted">{t("detail.typeLabel")}</dt>
            <dd className="font-mono text-sm">{blueprint.outputType}</dd>
          </div>
          <div>
            <dt className="text-xs text-text-muted">
              {t("detail.craftTimeLabel")}
            </dt>
            <dd className="font-mono text-accent-secondary">
              {craftMinutes(blueprint.craftTimeSeconds)} min
            </dd>
          </div>
          <div>
            <dt className="text-xs text-text-muted">
              {t("detail.availabilityLabel")}
            </dt>
            <dd>
              {blueprint.isAvailableByDefault
                ? t("detail.availableByDefault")
                : t("detail.needsUnlock")}
            </dd>
          </div>
        </dl>
      </Panel>

      <h2 className="text-lg font-medium">{t("detail.ingredientsHeading")}</h2>
      <BlueprintComponentsTable
        ingredients={blueprint.ingredients}
        materialsByCode={materialsByCode}
      />
      <p className="text-xs text-text-muted">
        {t("source.attribution", { version: blueprint.gameVersion })}
      </p>
    </PageShell>
  );
}
