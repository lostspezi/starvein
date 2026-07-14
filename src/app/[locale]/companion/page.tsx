import { getTranslations, setRequestLocale } from "next-intl/server";
import { CompanionGuide } from "@/features/companion/CompanionGuide";
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
    path: "/companion",
    title: t("companion.title"),
    description: t("companion.description"),
  });
}

export default async function CompanionPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("companion");

  return (
    <PageShell>
      <PageHeader title={t("title")} />
      <CompanionGuide />
    </PageShell>
  );
}
