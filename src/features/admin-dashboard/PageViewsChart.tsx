"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { SeoAnalytics } from "./cloudflare-analytics.schema";

function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

/** Tägliche Page-Views (Cloudflare RUM) als Balkenchart, Design-System-gethemt. */
export function PageViewsChart({ data }: { data: SeoAnalytics["pageViews"] }) {
  const animate = !prefersReducedMotion();

  return (
    <div className="h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          margin={{ top: 8, right: 8, bottom: 0, left: -20 }}
        >
          <CartesianGrid stroke="var(--color-bg-nebula-2)" vertical={false} />
          <XAxis
            dataKey="date"
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
            cursor={{ fill: "var(--color-bg-nebula-2)", fillOpacity: 0.4 }}
          />
          <Bar
            dataKey="views"
            fill="var(--color-accent-secondary)"
            radius={[2, 2, 0, 0]}
            isAnimationActive={animate}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
