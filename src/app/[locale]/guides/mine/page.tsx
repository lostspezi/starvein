import { headers } from "next/headers";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { listGuidesByOwner } from "@/features/guides/guides.repository";
import {
  GUIDE_LANGUAGE_NAMES,
  type GuideLanguage,
} from "@/features/guides/guides.languages";
import { pickGuideTranslation } from "@/features/guides/guides.schema";
import { OwnerActions } from "@/features/guides/OwnerActions";
import { Link } from "@/i18n/navigation";
import { Badge } from "@/lib/components/ui/Badge";
import { Button } from "@/lib/components/ui/Button";
import { PageHeader } from "@/lib/components/ui/PageHeader";
import { PageShell } from "@/lib/components/ui/PageShell";
import { panelClasses } from "@/lib/components/ui/Panel";
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
  return { title: t("myGuides.title"), robots: NO_INDEX };
}

export default async function MyGuidesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const uiLanguage = locale as GuideLanguage;

  const t = await getTranslations("guides");
  const userId = await getSessionUserId(await headers());

  if (!userId) {
    return (
      <PageShell>
        <PageHeader title={t("mine.title")} />
        <p className="text-text-muted">{t("mine.loginRequired")}</p>
      </PageShell>
    );
  }

  const db = await getDb();
  const guides = await listGuidesByOwner(db, userId);

  return (
    <PageShell width="wide">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <PageHeader title={t("mine.title")} subtitle={t("mine.subtitle")} />
        <Link href="/guides/new">
          <Button>{t("browse.createCta")}</Button>
        </Link>
      </div>

      {guides.length === 0 ? (
        <p className="text-text-muted">{t("mine.empty")}</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {guides.map((guide) => (
            <li
              key={guide.id}
              className={`${panelClasses()} flex flex-wrap items-center justify-between gap-3 p-4`}
            >
              <div className="flex flex-col gap-1">
                <Link
                  href={`/guides/${guide.id}`}
                  className="font-medium transition-colors duration-150 hover:text-accent-glow"
                >
                  {pickGuideTranslation(guide, uiLanguage).title}
                </Link>
                <div className="flex flex-wrap items-center gap-2 text-sm text-text-muted">
                  <Badge tone={guide.isPublic ? "success" : "default"}>
                    {t(guide.isPublic ? "card.public" : "card.private")}
                  </Badge>
                  {guide.translations.map((translation) => (
                    <Badge key={translation.language}>
                      {GUIDE_LANGUAGE_NAMES[translation.language]}
                    </Badge>
                  ))}
                </div>
              </div>
              <OwnerActions
                guideId={guide.id}
                isPublic={guide.isPublic}
                canEdit
                canDelete
              />
            </li>
          ))}
        </ul>
      )}
    </PageShell>
  );
}
