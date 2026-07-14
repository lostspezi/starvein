"use client";

import { useFormatter, useTranslations } from "next-intl";
import { useSyncExternalStore } from "react";
import { Badge } from "@/lib/components/ui/Badge";
import { jobReadyAt, remainingMinutes } from "./job-time";

const TICK_MS = 30_000;

/**
 * Geteilter 30-Sekunden-Ticker für alle Countdown-Instanzen. Auf dem
 * Server (und im Initial-Render vor dem Subscribe) ist der Snapshot null —
 * so enthält der SSR-Output kein Date.now() und es gibt keinen
 * Hydration-Mismatch.
 */
const listeners = new Set<() => void>();
let tickerNowMs: number | null = null;
let tickerId: ReturnType<typeof setInterval> | null = null;

function subscribe(listener: () => void): () => void {
  if (listeners.size === 0) {
    tickerNowMs = Date.now();
    tickerId = setInterval(() => {
      tickerNowMs = Date.now();
      for (const notify of listeners) notify();
    }, TICK_MS);
  }
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0 && tickerId !== null) {
      clearInterval(tickerId);
      tickerId = null;
      tickerNowMs = null;
    }
  };
}

const getSnapshot = () => tickerNowMs;
const getServerSnapshot = () => null;

/**
 * Status-Badge plus tickende Restzeit eines laufenden Jobs. Der
 * Initial-Render zeigt deterministisch "processing" und den absoluten
 * Fertig-Zeitpunkt; nach dem Mount kommt die Restzeit dazu und der
 * Status kippt clientseitig auf "ready".
 */
export function JobCountdown({
  startedAt,
  durationMinutes,
}: {
  startedAt: string;
  durationMinutes: number;
}) {
  const t = useTranslations("refineryJobs.card");
  const format = useFormatter();
  const nowMs = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const job = { startedAt, durationMinutes };
  const readyLabel = t("readyAt", {
    time: format.dateTime(new Date(jobReadyAt(job)), {
      dateStyle: "medium",
      timeStyle: "short",
    }),
  });
  const remaining = nowMs === null ? null : remainingMinutes(job, nowMs);
  const isReady = remaining === 0;

  return (
    <span className="flex flex-wrap items-center gap-2 text-sm text-text-muted">
      <Badge tone={isReady ? "success" : "default"}>
        {t(isReady ? "ready" : "processing")}
      </Badge>
      {remaining !== null && remaining > 0 && (
        <span className="font-mono text-accent-secondary">
          {t("remaining", {
            hours: Math.floor(remaining / 60),
            minutes: remaining % 60,
          })}
        </span>
      )}
      <span>{readyLabel}</span>
    </span>
  );
}
