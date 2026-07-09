"use client";

import { useTranslations } from "next-intl";
import { parseAsStringLiteral, useQueryState } from "nuqs";
import { MINING_METHODS } from "@/features/ores/ores.schema";

export function MethodFilter() {
  const t = useTranslations("ores");
  const [method, setMethod] = useQueryState(
    "method",
    parseAsStringLiteral(MINING_METHODS).withOptions({ shallow: false }),
  );

  const baseClass = "rounded px-2 py-1 text-sm";
  const activeClass = `${baseClass} bg-bg-nebula-2 font-medium text-accent-glow`;
  const inactiveClass = `${baseClass} text-text-muted hover:bg-bg-nebula-2 hover:text-text-primary`;

  return (
    <div
      role="group"
      aria-label={t("filter.methodLabel")}
      className="flex flex-wrap gap-1"
    >
      <button
        type="button"
        onClick={() => setMethod(null)}
        className={method === null ? activeClass : inactiveClass}
      >
        {t("method.all")}
      </button>
      {MINING_METHODS.map((option) => (
        <button
          key={option}
          type="button"
          onClick={() => setMethod(option)}
          className={method === option ? activeClass : inactiveClass}
        >
          {t(`method.${option}`)}
        </button>
      ))}
    </div>
  );
}
