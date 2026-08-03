import { headers } from "next/headers";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ApiKeysManager } from "@/features/api-keys/ApiKeysManager";
import { listKeys } from "@/features/api-keys/api-keys.service";
import { Link } from "@/i18n/navigation";
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
  return { title: t("apiKeys.title"), robots: NO_INDEX };
}

export default async function ApiKeysPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("apiKeys");
  const userId = await getSessionUserId(await headers());

  if (!userId) {
    return (
      <PageShell>
        <PageHeader title={t("title")} />
        <p className="text-text-muted">{t("loginRequired")}</p>
      </PageShell>
    );
  }

  const db = await getDb();
  const keys = await listKeys(db, userId);

  return (
    <PageShell>
      <PageHeader title={t("title")} />
      <ApiKeysManager initialKeys={keys} />
      <p className="mt-8">
        <Link
          href="/api-docs"
          className="text-accent-primary transition-colors duration-150 hover:text-accent-glow"
        >
          {t("docsLink")} →
        </Link>
      </p>
    </PageShell>
  );
}
