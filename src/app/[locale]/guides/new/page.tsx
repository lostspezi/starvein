import { headers } from "next/headers";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { GuideEditor } from "@/features/guides/GuideEditor";
import type { GuideLanguage } from "@/features/guides/guides.languages";
import { PageHeader } from "@/lib/components/ui/PageHeader";
import { PageShell } from "@/lib/components/ui/PageShell";
import { getSessionUserId } from "@/lib/session";
import { NO_INDEX } from "@/lib/seo";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "meta" });
  return { title: t("newGuide.title"), robots: NO_INDEX };
}

export default async function NewGuidePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("guides.editor");
  const userId = await getSessionUserId(await headers());

  if (!userId) {
    return (
      <PageShell>
        <PageHeader title={t("createTitle")} />
        <p className="text-text-muted">{t("loginRequired")}</p>
      </PageShell>
    );
  }

  return (
    <PageShell width="wide">
      <PageHeader title={t("createTitle")} />
      <GuideEditor defaultLanguage={locale as GuideLanguage} />
    </PageShell>
  );
}
