"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { KeyStats } from "./key-stats.service";

function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-bg-nebula-2 bg-bg-nebula p-3">
      <div className="text-xs text-text-muted">{label}</div>
      <div className="font-mono text-lg text-accent-secondary">{value}</div>
    </div>
  );
}

/**
 * Nutzungs-Dashboard eines Keys: Stat-Tiles, 30-Tage-Requests-Chart und
 * Top-Endpoints mit proportionalen Balken. Lädt beim Aufklappen von
 * /api/account/api-keys/{id}/stats.
 */
export function KeyStatsPanel({
  keyId,
  statsBasePath = "/api/account/api-keys",
}: {
  keyId: string;
  /** Admin-Übersicht nutzt die ownership-freie Route unter /api/admin. */
  statsBasePath?: string;
}) {
  const t = useTranslations("apiKeys.stats");
  const [stats, setStats] = useState<KeyStats | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    let cancelled = false;
    fetch(`${statsBasePath}/${keyId}/stats`)
      .then(async (response) => {
        if (!response.ok) throw new Error("stats failed");
        const data = (await response.json()) as KeyStats;
        if (!cancelled) {
          setStats(data);
          setState("ready");
        }
      })
      .catch(() => {
        if (!cancelled) setState("error");
      });
    return () => {
      cancelled = true;
    };
  }, [keyId, statsBasePath]);

  if (state === "loading") {
    return <p className="p-3 text-sm text-text-muted">{t("loading")}</p>;
  }
  if (state === "error" || !stats) {
    return <p className="p-3 text-sm text-warning">{t("error")}</p>;
  }
  if (stats.totals.total === 0) {
    return <p className="p-3 text-sm text-text-muted">{t("empty")}</p>;
  }

  const animate = !prefersReducedMotion();
  const maxEndpointCount = stats.topEndpoints[0]?.count ?? 1;

  return (
    <div className="space-y-4 p-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatTile
          label={t("totalRequests")}
          value={String(stats.totals.total)}
        />
        <StatTile
          label={t("errorRate")}
          value={`${stats.totals.errorRatePercent}%`}
        />
        <StatTile
          label={t("rateLimited")}
          value={String(stats.totals.count429)}
        />
      </div>

      <div>
        <h4 className="mb-2 text-sm text-text-muted">{t("requestsPerDay")}</h4>
        <div className="h-48 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={stats.series}
              margin={{ top: 8, right: 8, bottom: 0, left: -20 }}
            >
              <CartesianGrid
                stroke="var(--color-bg-nebula-2)"
                vertical={false}
              />
              <XAxis
                dataKey="day"
                tickFormatter={(value: string) => value.slice(5)}
                tick={{ fill: "var(--color-text-muted)", fontSize: 11 }}
                interval="preserveStartEnd"
                minTickGap={24}
                stroke="var(--color-bg-nebula-2)"
              />
              <YAxis
                allowDecimals={false}
                width={32}
                tick={{ fill: "var(--color-text-muted)", fontSize: 11 }}
                stroke="var(--color-bg-nebula-2)"
              />
              <Tooltip
                contentStyle={{
                  background: "var(--color-bg-nebula)",
                  border: "1px solid var(--color-glass-border)",
                  borderRadius: 8,
                  color: "var(--color-text-primary)",
                  fontSize: 12,
                }}
                labelStyle={{ color: "var(--color-text-muted)" }}
                cursor={{
                  stroke: "var(--color-accent-cyan)",
                  strokeOpacity: 0.3,
                }}
              />
              <Line
                type="monotone"
                dataKey="total"
                stroke="var(--color-accent-primary)"
                strokeWidth={2}
                dot={false}
                isAnimationActive={animate}
              />
              <Line
                type="monotone"
                dataKey="errors"
                stroke="var(--color-warning)"
                strokeWidth={1.5}
                dot={false}
                isAnimationActive={animate}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div>
        <h4 className="mb-2 text-sm text-text-muted">{t("topEndpoints")}</h4>
        <ul className="space-y-1.5">
          {stats.topEndpoints.map((entry) => (
            <li key={entry.endpoint} className="flex items-center gap-2">
              <span className="w-44 shrink-0 truncate font-mono text-xs text-text-primary">
                {entry.endpoint}
              </span>
              <span
                aria-hidden
                className="h-2 rounded bg-accent-secondary/70"
                style={{
                  width: `${Math.max(4, (entry.count / maxEndpointCount) * 100)}%`,
                }}
              />
              <span className="font-mono text-xs text-text-muted">
                {entry.count}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
