import { useTranslations } from "use-intl";
import type { RefineryJob } from "@starvein/shared/refinery-jobs";
import { isJobReady, remainingMinutes } from "@starvein/shared/job-time";
import { formatRemaining } from "./format";

function JobRow({ job, nowMs }: { job: RefineryJob; nowMs: number }) {
  const t = useTranslations("jobs");
  const collected = job.status === "collected";
  const ready = !collected && isJobReady(job, nowMs);

  return (
    <li className="border-glass-border bg-glass flex items-center justify-between gap-4 rounded-lg border p-3 backdrop-blur-md">
      <div className="min-w-0">
        <p className="text-text-primary truncate text-sm font-medium">
          {job.terminalName}
        </p>
        <p className="text-text-muted truncate text-xs">
          {job.items
            .map((item) => `${item.oreCode} · ${item.quantityScu} SCU`)
            .join(", ")}
        </p>
      </div>
      <div className="shrink-0 text-right">
        {collected ? (
          <span className="text-text-muted text-xs">{t("collected")}</span>
        ) : ready ? (
          <span className="text-success text-sm font-medium">{t("ready")}</span>
        ) : (
          <span className="text-accent-secondary font-mono text-sm">
            {formatRemaining(remainingMinutes(job, nowMs))}
          </span>
        )}
      </div>
    </li>
  );
}

export function JobList({
  jobs,
  nowMs,
  onRefresh,
  refreshFailed = false,
}: {
  jobs: RefineryJob[];
  nowMs: number;
  onRefresh: () => void;
  refreshFailed?: boolean;
}) {
  const t = useTranslations("jobs");

  return (
    <section className="flex w-full max-w-2xl flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="text-accent-ice text-sm font-medium tracking-wide">
          {t("title")}
        </h2>
        <button
          type="button"
          onClick={onRefresh}
          className="text-text-muted hover:bg-bg-nebula-2 hover:text-text-primary rounded px-2 py-1 text-xs transition-colors duration-150"
        >
          {t("refresh")}
        </button>
      </div>
      {refreshFailed && (
        <p className="text-warning text-xs" role="alert">
          {t("refreshFailed")}
        </p>
      )}
      {jobs.length === 0 ? (
        <p className="text-text-muted text-sm">{t("empty")}</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {jobs.map((job) => (
            <JobRow key={job.id} job={job} nowMs={nowMs} />
          ))}
        </ul>
      )}
    </section>
  );
}
