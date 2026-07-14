import { useEffect, useState } from "react";
import { JobList } from "./JobList";
import { useJobs } from "./useJobs";

const NOW_TICK_MS = 30_000;

/** Container: Polling-Hook + tickende Uhr für die Countdown-Anzeige. */
export function JobsPanel({
  token,
  onUnauthorized,
}: {
  token: string;
  onUnauthorized: () => void;
}) {
  const { jobs, failed, refresh } = useJobs(token, onUnauthorized);
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNowMs(Date.now()), NOW_TICK_MS);
    return () => clearInterval(id);
  }, []);

  if (jobs === null) {
    return null;
  }

  return (
    <JobList
      jobs={jobs}
      nowMs={nowMs}
      onRefresh={() => void refresh()}
      refreshFailed={failed}
    />
  );
}
