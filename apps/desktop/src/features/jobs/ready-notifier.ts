import type { RefineryJob } from "@starvein/shared/refinery-jobs";
import { isJobReady } from "@starvein/shared/job-time";

function isNotifiable(job: RefineryJob, nowMs: number): boolean {
  return job.status === "processing" && isJobReady(job, nowMs);
}

/**
 * Initialbestand der "schon benachrichtigt"-Menge: alles, was beim App-Start
 * bereits fertig ist, gilt als bekannt — sonst würde jeder Start alte
 * Ready-Jobs erneut melden.
 */
export function seedNotifiedIds(
  jobs: RefineryJob[],
  nowMs: number,
): Set<string> {
  return new Set(
    jobs.filter((job) => isNotifiable(job, nowMs)).map((job) => job.id),
  );
}

/** Jobs, die gerade fertig geworden sind und noch nicht gemeldet wurden. */
export function detectNewlyReady(
  jobs: RefineryJob[],
  nowMs: number,
  notifiedIds: ReadonlySet<string>,
): RefineryJob[] {
  return jobs.filter(
    (job) => isNotifiable(job, nowMs) && !notifiedIds.has(job.id),
  );
}
