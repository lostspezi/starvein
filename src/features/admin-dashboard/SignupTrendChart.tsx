"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { DailyCount } from "./registrations.schema";

function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

/**
 * Registrierungs-Zeitreihe als Linienchart, ans „Tiefes All"-Design-System
 * gethemt (Farben über CSS-Custom-Properties aus globals.css). Bei reduzierter
 * Bewegung wird die Einzeichen-Animation deaktiviert.
 */
export function SignupTrendChart({ data }: { data: DailyCount[] }) {
  const animate = !prefersReducedMotion();

  return (
    <div className="h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
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
            cursor={{ stroke: "var(--color-accent-cyan)", strokeOpacity: 0.3 }}
          />
          <Line
            type="monotone"
            dataKey="count"
            stroke="var(--color-accent-primary)"
            strokeWidth={2}
            dot={false}
            isAnimationActive={animate}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
