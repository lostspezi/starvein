import type { RefineryJob } from "./refinery-jobs.schema";

type JobTiming = Pick<RefineryJob, "startedAt" | "durationMinutes">;

const MS_PER_MINUTE = 60_000;

/** Zeitpunkt, zu dem der Job fertig ist (ISO). */
export function jobReadyAt(job: JobTiming): string {
  return new Date(
    Date.parse(job.startedAt) + job.durationMinutes * MS_PER_MINUTE,
  ).toISOString();
}

export function isJobReady(job: JobTiming, nowMs: number): boolean {
  return nowMs >= Date.parse(jobReadyAt(job));
}

/** Restzeit in Minuten, aufgerundet und bei 0 geklemmt. */
export function remainingMinutes(job: JobTiming, nowMs: number): number {
  const remainingMs = Date.parse(jobReadyAt(job)) - nowMs;
  return Math.max(0, Math.ceil(remainingMs / MS_PER_MINUTE));
}
