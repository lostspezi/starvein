"use client";

import { useEffect, useRef, useState } from "react";

function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

/**
 * Zahlenwert mit rAF-Count-up bei Wertänderung. Der erste Render (inkl. SSR)
 * zeigt sofort den Endwert — animiert wird nur der Übergang zwischen Werten;
 * bei reduzierter Bewegung springt der Wert direkt.
 */
export function AnimatedNumber({
  value,
  format = (n) => String(Math.round(n)),
  durationMs = 300,
  className,
}: {
  value: number;
  format?: (n: number) => string;
  durationMs?: number;
  className?: string;
}) {
  const [display, setDisplay] = useState(value);
  const previous = useRef(value);

  useEffect(() => {
    const from = previous.current;
    previous.current = value;
    if (from === value) {
      return;
    }
    if (prefersReducedMotion() || typeof requestAnimationFrame !== "function") {
      setDisplay(value);
      return;
    }

    let start: number | null = null;
    let frame = requestAnimationFrame(function tick(now: number) {
      start ??= now;
      const progress = Math.min((now - start) / durationMs, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(from + (value - from) * eased);
      if (progress < 1) {
        frame = requestAnimationFrame(tick);
      }
    });
    return () => cancelAnimationFrame(frame);
  }, [value, durationMs]);

  return <span className={className}>{format(display)}</span>;
}
