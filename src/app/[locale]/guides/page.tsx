import { getTranslations, setRequestLocale } from "next-intl/server";
import { GuideCard } from "@/features/guides/GuideCard";
import { GuidesFilters } from "@/features/guides/GuidesFilters";
import {
  GUIDE_SORTS,
  listPublicGuides,
  listPublicGuideTags,
  type GuideSort,
} from "@/features/guides/guides.repository";
import { Link } from "@/i18n/navigation";
import { Button } from "@/lib/components/ui/Button";
import { PageHeader } from "@/lib/components/ui/PageHeader";
import { PageShell } from "@/lib/components/ui/PageShell";
import { getDb } from "@/lib/db";
import { parseEnumParam } from "@/lib/search-params";
import { pageMetadata } from "@/lib/seo";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "meta" });
  return pageMetadata({
    locale,
    path: "/guides",
    title: t("guides.title"),
    description: t("guides.description"),
  });
}

export default async function GuidesPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q : undefined;
  const selectedTags =
    typeof sp.tags === "string" ? sp.tags.split(",").filter(Boolean) : [];
  const sort = parseEnumParam<GuideSort>(sp.sort, GUIDE_SORTS) ?? "new";

  const t = await getTranslations("guides");
  const db = await getDb();
  const [guides, tags] = await Promise.all([
    listPublicGuides(db, { q, tags: selectedTags, sort }),
    listPublicGuideTags(db),
  ]);
  const hasFilters = Boolean(q) || selectedTags.length > 0;

  return (
    <PageShell width="wide">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <PageHeader title={t("title")} subtitle={t("subtitle")} />
        <Link href="/guides/new">
          <Button>{t("browse.createCta")}</Button>
        </Link>
      </div>

      <GuidesFilters tags={tags} />

      {guides.length === 0 ? (
        <p className="text-text-muted">
          {t(hasFilters ? "browse.noResults" : "browse.empty")}
        </p>
      ) : (
        <>
          <p className="text-sm text-text-muted">
            {t("browse.resultsCount", { count: guides.length })}
          </p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {guides.map((guide) => (
              <GuideCard key={guide.id} guide={guide} />
            ))}
          </div>
        </>
      )}
    </PageShell>
  );
}
