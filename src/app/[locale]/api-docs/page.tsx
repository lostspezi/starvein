import { getTranslations, setRequestLocale } from "next-intl/server";
import { ApiQuickstart } from "@/features/public-api/ApiQuickstart";
import { ScalarReference } from "@/features/public-api/ScalarReference";
import { PageHeader } from "@/lib/components/ui/PageHeader";
import { PageShell } from "@/lib/components/ui/PageShell";
import { pageMetadata } from "@/lib/seo";
import type { Metadata } from "next";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "meta" });
  return pageMetadata({
    locale,
    path: "/api-docs",
    title: t("apiDocs.title"),
    description: t("apiDocs.description"),
  });
}

export default async function ApiDocsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("publicApi");

  return (
    <PageShell>
      <PageHeader title={t("title")} />
      <ApiQuickstart />
      <h2 className="mt-10 mb-2 text-lg font-semibold text-accent-ice">
        {t("referenceTitle")}
      </h2>
      <ScalarReference />
    </PageShell>
  );
}
