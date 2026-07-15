import { getTranslations, setRequestLocale } from "next-intl/server";
import { CompanionGuide } from "@/features/companion/CompanionGuide";
import { fetchCompanionRelease } from "@/features/companion/companion-release";
import { PageHeader } from "@/lib/components/ui/PageHeader";
import { PageShell } from "@/lib/components/ui/PageShell";
import { pageMetadata } from "@/lib/seo";
import { COMPANION_VERSION } from "@/lib/site-config";
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
  // Aktuelle Version aus dem neuesten GitHub-Release; der statische Wert
  // aus site-config ist nur der Fallback, falls GitHub nicht erreichbar ist.
  const release = await fetchCompanionRelease();

  return (
    <PageShell>
      <PageHeader title={t("title")} />
      <CompanionGuide version={release?.version ?? COMPANION_VERSION} />
    </PageShell>
  );
}
