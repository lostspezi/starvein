import { headers } from "next/headers";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { findAllOres } from "@/features/ores/ores.repository";
import { listRefineryMethods } from "@/features/refinery-and-prices/refinery-catalog";
import { CollectJobButton } from "@/features/refinery-jobs/CollectJobButton";
import { JobActions } from "@/features/refinery-jobs/JobActions";
import { JobCountdown } from "@/features/refinery-jobs/JobCountdown";
import { jobReadyAt } from "@/features/refinery-jobs/job-time";
import { listRefineryJobsByOwner } from "@/features/refinery-jobs/refinery-jobs.repository";
import type { RefineryJob } from "@/features/refinery-jobs/refinery-jobs.schema";
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
  return { title: t("myRefineryJobs.title"), robots: NO_INDEX };
}

export default async function RefineryJobsPage({
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
        <PageHeader title={t("title")} />
        <p className="text-text-muted">{t("loginRequired")}</p>
      </PageShell>
    );
  }

  const db = await getDb();
  const [jobs, ores, methods] = await Promise.all([
    listRefineryJobsByOwner(db, userId),
    findAllOres(db),
    listRefineryMethods(db),
  ]);
  const oreNames = new Map(ores.map((ore) => [ore.code, ore.name_en]));
  const methodNames = new Map(methods.map((m) => [m.code, m.name]));

  const active = jobs
    .filter((job) => job.status === "processing")
    .sort((a, b) => jobReadyAt(a).localeCompare(jobReadyAt(b)));
  const collected = jobs.filter((job) => job.status === "collected");

  function jobItems(job: RefineryJob) {
    return job.items.map((item) => ({
      oreCode: item.oreCode,
      oreName: oreNames.get(item.oreCode) ?? item.oreCode,
      quantityScu: item.quantityScu,
      qualityRating: item.qualityRating,
    }));
  }

  function jobHeader(job: RefineryJob) {
    return (
      <div className="flex flex-col gap-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-medium">{job.terminalName}</span>
          {job.starSystemName && (
            <span className="text-sm text-text-muted">
              {job.starSystemName}
            </span>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2 text-sm text-text-muted">
          <span>
            {t("card.method", {
              method: methodNames.get(job.methodCode) ?? job.methodCode,
            })}
          </span>
          {jobItems(job).map((item) => (
            <span key={item.oreCode} className="font-mono text-xs">
              {item.oreName} · {item.quantityScu} SCU
              {item.qualityRating != null &&
                ` · ${t("card.quality", { value: item.qualityRating })}`}
            </span>
          ))}
        </div>
      </div>
    );
  }

  return (
    <PageShell width="wide">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <PageHeader title={t("title")} subtitle={t("subtitle")} />
        <Link href="/refinery-jobs/new">
          <Button>{t("newJobCta")}</Button>
        </Link>
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-medium">{t("sections.active")}</h2>
        {active.length === 0 ? (
          <p className="text-text-muted">{t("emptyActive")}</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {active.map((job) => (
              <li
                key={job.id}
                className={`${panelClasses()} flex flex-col gap-3 p-4`}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  {jobHeader(job)}
                  <JobActions jobId={job.id} />
                </div>
                <JobCountdown
                  startedAt={job.startedAt}
                  durationMinutes={job.durationMinutes}
                />
                <div className="flex flex-wrap">
                  <CollectJobButton jobId={job.id} items={jobItems(job)} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-medium">{t("sections.history")}</h2>
        {collected.length === 0 ? (
          <p className="text-text-muted">{t("emptyHistory")}</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {collected.map((job) => (
              <li
                key={job.id}
                className={`${panelClasses()} flex flex-wrap items-start justify-between gap-3 p-4`}
              >
                {jobHeader(job)}
                <div className="flex flex-wrap items-center gap-2">
                  <Badge>{t("card.collected")}</Badge>
                  <JobActions jobId={job.id} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </PageShell>
  );
}
