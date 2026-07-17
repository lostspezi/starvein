import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { GuideContent } from "@/features/guides/GuideContent";
import {
  GUIDE_LANGUAGE_NAMES,
  isGuideLanguage,
  type GuideLanguage,
} from "@/features/guides/guides.languages";
import { getGuideForViewer } from "@/features/guides/guides.service";
import { pickGuideTranslation } from "@/features/guides/guides.schema";
import { GuideVoteButton } from "@/features/guides/GuideVoteButton";
import { OwnerActions } from "@/features/guides/OwnerActions";
import { Link } from "@/i18n/navigation";
import { Badge } from "@/lib/components/ui/Badge";
import { PageHeader } from "@/lib/components/ui/PageHeader";
import { PageShell } from "@/lib/components/ui/PageShell";
import { getDb } from "@/lib/db";
import { CURRENT_PATCH_VERSION } from "@/lib/patch";
import { getSessionUser } from "@/lib/session";
import { pageMetadata } from "@/lib/seo";
import { cn } from "@/lib/cn";
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
  const translation = pickGuideTranslation(guide, locale as GuideLanguage);
  return pageMetadata({
    locale,
    path: `/guides/${id}`,
    title: translation.title,
    description: translation.description,
    ownOgImage: true,
  });
}

export default async function GuideDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
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

  const sp = await searchParams;
  const langParam = typeof sp.lang === "string" ? sp.lang : undefined;
  const preferred: GuideLanguage = isGuideLanguage(langParam)
    ? langParam
    : (locale as GuideLanguage);
  const translation = pickGuideTranslation(guide, preferred);
  const isFallback = translation.language !== preferred;

  const isOwner = user?.id === guide.ownerUserId;
  const isAdmin = user?.role === "admin";
  const canDelete = isOwner || isAdmin;
  const outdated = guide.patchVersion !== CURRENT_PATCH_VERSION;

  return (
    <PageShell width="wide">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <PageHeader
          title={translation.title}
          subtitle={
            translation.description ? (
              <span>{translation.description}</span>
            ) : undefined
          }
        />
        <div className="flex items-center gap-3">
          {guide.isPublic && (
            <GuideVoteButton
              guideId={guide.id}
              initialVotes={guide.votes.up}
              initialHasVoted={
                user !== null &&
                user !== undefined &&
                guide.voters.includes(user.id)
              }
              isOwner={isOwner}
            />
          )}
          {canDelete && (
            <OwnerActions
              guideId={guide.id}
              isPublic={guide.isPublic}
              canEdit={isOwner}
              canDelete={canDelete}
            />
          )}
        </div>
      </div>

      {guide.translations.length > 1 && (
        <div
          role="group"
          aria-label={t("detail.languageSwitcher")}
          className="flex flex-wrap items-center gap-1.5"
        >
          {guide.translations.map((tr) => {
            const active = tr.language === translation.language;
            return (
              <Link
                key={tr.language}
                href={`/guides/${guide.id}?lang=${tr.language}`}
                aria-current={active ? "true" : undefined}
                className={cn(
                  "rounded-full px-3 py-1 text-xs transition-all duration-150",
                  active
                    ? "bg-accent-primary font-medium text-bg-void shadow-glow-primary"
                    : "border border-bg-nebula-2 text-text-muted hover:border-accent-cyan hover:text-text-primary",
                )}
              >
                {GUIDE_LANGUAGE_NAMES[tr.language]}
              </Link>
            );
          })}
        </div>
      )}

      {(guide.tags.length > 0 || outdated || !guide.isPublic || isFallback) && (
        <div className="flex flex-wrap items-center gap-2">
          {!guide.isPublic && <Badge>{t("card.private")}</Badge>}
          {isFallback && (
            <Badge tone="warning">
              {t("detail.fallbackLanguage", {
                language: GUIDE_LANGUAGE_NAMES[translation.language],
              })}
            </Badge>
          )}
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

      <GuideContent content={translation.content} />
    </PageShell>
  );
}
