import { headers } from "next/headers";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { DeviceApprovePanel } from "@/features/device-auth/DeviceApprovePanel";
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
  return { title: t("device.title"), robots: NO_INDEX };
}

export default async function DevicePage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ user_code?: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("deviceAuth");
  const { user_code: userCode = "" } = await searchParams;
  const userId = await getSessionUserId(await headers());

  return (
    <PageShell>
      <PageHeader title={t("title")} />
      {userId ? (
        <DeviceApprovePanel initialUserCode={userCode} />
      ) : (
        <p className="text-text-muted">{t("loginRequired")}</p>
      )}
    </PageShell>
  );
}
