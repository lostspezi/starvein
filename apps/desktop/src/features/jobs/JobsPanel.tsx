import { useEffect, useRef, useState } from "react";
import { useTranslations } from "use-intl";
import { notify } from "../../lib/notify";
import { JobList } from "./JobList";
import { detectNewlyReady, seedNotifiedIds } from "./ready-notifier";
import { useJobs } from "./useJobs";

const NOW_TICK_MS = 30_000;

/**
 * Container: Polling-Hook, tickende Uhr für die Countdown-Anzeige und
 * native Benachrichtigung, sobald ein Job fertig wird (auch im Tray).
 */
export function JobsPanel({
  token,
  onUnauthorized,
}: {
  token: string;
  onUnauthorized: () => void;
}) {
  const t = useTranslations("jobs");
  const { jobs, failed, refresh, collect, collectingId, collectError } =
    useJobs(token, onUnauthorized);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const notifiedIds = useRef<Set<string> | null>(null);

  useEffect(() => {
    const id = setInterval(() => setNowMs(Date.now()), NOW_TICK_MS);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (jobs === null) {
      return;
    }
    if (notifiedIds.current === null) {
      notifiedIds.current = seedNotifiedIds(jobs, nowMs);
      return;
    }
    for (const job of detectNewlyReady(jobs, nowMs, notifiedIds.current)) {
      notifiedIds.current.add(job.id);
      void notify(
        t("notification.title"),
        t("notification.body", { terminal: job.terminalName }),
      );
    }
  }, [jobs, nowMs, t]);

  if (jobs === null) {
    return null;
  }

  return (
    <JobList
      jobs={jobs}
      nowMs={nowMs}
      onRefresh={() => void refresh()}
      refreshFailed={failed}
      onCollect={(jobId) => void collect(jobId)}
      collectingId={collectingId}
      collectError={collectError}
    />
  );
}
