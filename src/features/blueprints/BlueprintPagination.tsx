"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { parseAsInteger, useQueryState } from "nuqs";

/** Prev/Next-Navigation der Blueprint-Liste (URL-State, wie die Filter). */
export function BlueprintPagination({
  page,
  totalPages,
  total,
}: {
  page: number;
  totalPages: number;
  total: number;
}) {
  const t = useTranslations("blueprints.pagination");
  // shallow: false, damit die Server-Komponente mit neuen searchParams rendert
  const [, setPage] = useQueryState(
    "page",
    parseAsInteger.withOptions({ shallow: false }),
  );

  if (totalPages <= 1) {
    return <p className="text-xs text-text-muted">{t("total", { total })}</p>;
  }

  const go = (next: number) => setPage(next === 1 ? null : next);
  const buttonClass =
    "inline-flex items-center gap-1 rounded px-2 py-1 text-sm transition-colors duration-150 disabled:opacity-40 enabled:hover:bg-bg-nebula-2 enabled:hover:text-text-primary";

  return (
    <nav
      aria-label={t("label")}
      className="flex items-center justify-between gap-2"
    >
      <button
        type="button"
        onClick={() => go(page - 1)}
        disabled={page <= 1}
        className={`${buttonClass} text-text-muted`}
      >
        <ChevronLeft aria-hidden="true" className="size-4" />
        {t("previous")}
      </button>
      <span className="text-xs text-text-muted">
        {t("status", { page, totalPages, total })}
      </span>
      <button
        type="button"
        onClick={() => go(page + 1)}
        disabled={page >= totalPages}
        className={`${buttonClass} text-text-muted`}
      >
        {t("next")}
        <ChevronRight aria-hidden="true" className="size-4" />
      </button>
    </nav>
  );
}
