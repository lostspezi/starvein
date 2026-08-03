import { getTranslations, setRequestLocale } from "next-intl/server";
import { ForStreamersContent } from "@/features/for-streamers/ForStreamersContent";
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
    path: "/for-streamers",
    title: t("forStreamers.title"),
    description: t("forStreamers.description"),
  });
}

export default async function ForStreamersPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("forStreamers");

  return (
    <PageShell>
      <PageHeader title={t("title")} subtitle={t("subtitle")} />
      <ForStreamersContent />
    </PageShell>
  );
}
