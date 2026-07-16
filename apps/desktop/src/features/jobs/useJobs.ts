import { useCallback, useEffect, useState } from "react";
import type { RefineryJob } from "@starvein/shared/refinery-jobs";
import { ApiError, collectRefineryJob, fetchOwnJobs } from "../../lib/api";

const POLL_INTERVAL_MS = 60_000;

export type CollectError = "rateLimited" | "protocol";

/**
 * Lädt die eigenen Refinery-Jobs und pollt alle 60 s (unter dem
 * Rate-Limit-Budget des Backends). 401 → onUnauthorized (Re-Login).
 * `collect` markiert einen Job als abgeholt und ersetzt ihn im State
 * durch die Server-Antwort (kein Extra-Poll gegen das Rate-Limit).
 */
export function useJobs(token: string, onUnauthorized: () => void) {
  const [jobs, setJobs] = useState<RefineryJob[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [collectingId, setCollectingId] = useState<string | null>(null);
  const [collectError, setCollectError] = useState<CollectError | null>(null);

  const refresh = useCallback(async () => {
    try {
      setJobs(await fetchOwnJobs(token));
      setFailed(false);
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        onUnauthorized();
        return;
      }
      setFailed(true);
    }
  }, [token, onUnauthorized]);

  const collect = useCallback(
    async (jobId: string) => {
      setCollectingId(jobId);
      setCollectError(null);
      try {
        const job = await collectRefineryJob(token, jobId);
        setJobs((prev) =>
          prev ? prev.map((j) => (j.id === job.id ? job : j)) : prev,
        );
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) {
          onUnauthorized();
          return;
        }
        if (
          error instanceof ApiError &&
          (error.status === 400 || error.status === 404)
        ) {
          // Zustand hat sich serverseitig geändert (z. B. via Web abgeholt
          // oder gelöscht) — still resyncen statt Fehler anzeigen.
          void refresh();
        } else if (error instanceof ApiError && error.status === 429) {
          setCollectError("rateLimited");
        } else {
          setCollectError("protocol");
        }
      } finally {
        setCollectingId(null);
      }
    },
    [token, onUnauthorized, refresh],
  );

  useEffect(() => {
    void refresh();
    const id = setInterval(() => void refresh(), POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [refresh]);

  return { jobs, failed, refresh, collect, collectingId, collectError };
}
