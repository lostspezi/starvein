"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "@/i18n/navigation";
import { boostDrift } from "./starfield-bus";

/** Feuert bei jedem Routenwechsel den Drift-Boost des Starfields. */
export function StarfieldRouteListener() {
  const pathname = usePathname();
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    boostDrift();
  }, [pathname]);

  return null;
}
