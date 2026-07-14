import { headers } from "next/headers";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { findAllOres } from "@/features/ores/ores.repository";
import {
  listRefineryMethods,
  listRefineryTerminals,
} from "@/features/refinery-and-prices/refinery-catalog";
import { RefineryJobForm } from "@/features/refinery-jobs/RefineryJobForm";
import { PageHeader } from "@/lib/components/ui/PageHeader";
import { PageShell } from "@/lib/components/ui/PageShell";
import { Panel } from "@/lib/components/ui/Panel";
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
  return { title: t("newRefineryJob.title"), robots: NO_INDEX };
}

export default async function NewRefineryJobPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("refineryJobs");
  const userId = await getSessionUserId(await headers());

  if (!userId) {
    return (
      <PageShell>
        <PageHeader title={t("form.title")} />
        <p className="text-text-muted">{t("loginRequired")}</p>
      </PageShell>
    );
  }

  const db = await getDb();
  const [terminals, methods, ores] = await Promise.all([
    listRefineryTerminals(db),
    listRefineryMethods(db),
    findAllOres(db),
  ]);

  return (
    <PageShell>
      <PageHeader title={t("form.title")} />
      {terminals.length === 0 || methods.length === 0 ? (
        <Panel className="p-4">
          <p className="text-text-muted">{t("form.terminalEmpty")}</p>
        </Panel>
      ) : (
        <RefineryJobForm
          terminals={terminals}
          methods={methods.map((method) => ({
            code: method.code,
            name: method.name,
            ratingYield: method.ratingYield,
            ratingCost: method.ratingCost,
            ratingSpeed: method.ratingSpeed,
          }))}
          ores={ores.map((ore) => ({ code: ore.code, name: ore.name_en }))}
        />
      )}
    </PageShell>
  );
}
