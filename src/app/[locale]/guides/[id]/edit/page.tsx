import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { GuideEditor } from "@/features/guides/GuideEditor";
import { findGuideById } from "@/features/guides/guides.repository";
import { PageHeader } from "@/lib/components/ui/PageHeader";
import { PageShell } from "@/lib/components/ui/PageShell";
import { getDb } from "@/lib/db";
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
  return { title: t("editGuide.title"), robots: NO_INDEX };
}

export default async function EditGuidePage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("guides.editor");
  const db = await getDb();
  const userId = await getSessionUserId(await headers());

  const guide = await findGuideById(db, id);
  // NotFound statt Forbidden: fremde/private Guides nicht verraten
  if (!guide || userId === null || guide.ownerUserId !== userId) {
    notFound();
  }

  return (
    <PageShell width="wide">
      <PageHeader title={t("editTitle")} />
      <GuideEditor
        guideId={guide.id}
        initialValue={{
          title: guide.title,
          description: guide.description,
          tags: guide.tags,
          isPublic: guide.isPublic,
          content: guide.content,
        }}
      />
    </PageShell>
  );
}
