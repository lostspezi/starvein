import { useCallback, useEffect, useState } from "react";
import type { RefineryJob } from "@starvein/shared/refinery-jobs";
import { ApiError, fetchOwnJobs } from "../../lib/api";

const POLL_INTERVAL_MS = 60_000;

/**
 * Lädt die eigenen Refinery-Jobs und pollt alle 60 s (unter dem
 * Rate-Limit-Budget des Backends). 401 → onUnauthorized (Re-Login).
 */
export function useJobs(token: string, onUnauthorized: () => void) {
  const [jobs, setJobs] = useState<RefineryJob[] | null>(null);
  const [failed, setFailed] = useState(false);

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

  useEffect(() => {
    void refresh();
    const id = setInterval(() => void refresh(), POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [refresh]);

  return { jobs, failed, refresh };
}
