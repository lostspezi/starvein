import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { GuideContent } from "@/features/guides/GuideContent";
import { getGuideForViewer } from "@/features/guides/guides.service";
import { OwnerActions } from "@/features/guides/OwnerActions";
import { Badge } from "@/lib/components/ui/Badge";
import { PageHeader } from "@/lib/components/ui/PageHeader";
import { PageShell } from "@/lib/components/ui/PageShell";
import { getDb } from "@/lib/db";
import { CURRENT_PATCH_VERSION } from "@/lib/patch";
import { getSessionUser } from "@/lib/session";
import { pageMetadata } from "@/lib/seo";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}): Promise<Metadata> {
  const { locale, id } = await params;
  const guide = await getGuideForViewer(await getDb(), id, null);
  if (!guide) return {};
  return pageMetadata({
    locale,
    path: `/guides/${id}`,
    title: guide.title,
    description: guide.description,
  });
}

export default async function GuideDetailPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("guides");
  const db = await getDb();
  const user = await getSessionUser(await headers());

  const guide = await getGuideForViewer(db, id, user?.id ?? null);
  if (!guide) {
    notFound();
  }

  const isOwner = user?.id === guide.ownerUserId;
  const isAdmin = user?.role === "admin";
  const canDelete = isOwner || isAdmin;
  const outdated = guide.patchVersion !== CURRENT_PATCH_VERSION;

  return (
    <PageShell width="wide">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <PageHeader
          title={guide.title}
          subtitle={
            guide.description ? <span>{guide.description}</span> : undefined
          }
        />
        {canDelete && (
          <OwnerActions
            guideId={guide.id}
            isPublic={guide.isPublic}
            canEdit={isOwner}
            canDelete={canDelete}
          />
        )}
      </div>

      {(guide.tags.length > 0 || outdated) && (
        <div className="flex flex-wrap items-center gap-2">
          {!guide.isPublic && <Badge>{t("card.private")}</Badge>}
          {guide.tags.map((tag) => (
            <Badge key={tag}>{tag}</Badge>
          ))}
          {outdated && (
            <Badge tone="warning">
              {t("card.outdated", { patchVersion: guide.patchVersion })}
            </Badge>
          )}
        </div>
      )}

      <GuideContent content={guide.content} />
    </PageShell>
  );
}
