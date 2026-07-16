"use client";

import { useTranslations } from "next-intl";
import { useEffect, useId, useRef, useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { cn } from "@/lib/cn";
import type { SearchResult } from "./search.service";

const MIN_QUERY_LENGTH = 2;

export function SearchBox({
  debounceMs = 200,
  ariaLabel,
  inputClassName,
}: {
  debounceMs?: number;
  /** Überschreibt das Standard-Label — nötig bei mehreren Suchfeldern pro Seite. */
  ariaLabel?: string;
  inputClassName?: string;
}) {
  const t = useTranslations();
  const router = useRouter();
  const listboxId = useId();

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (query.trim().length < MIN_QUERY_LENGTH) {
      return;
    }

    const timer = setTimeout(async () => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      try {
        const response = await fetch(
          `/api/search?q=${encodeURIComponent(query.trim())}`,
          { signal: controller.signal },
        );
        if (!response.ok) return;
        const data: SearchResult[] = await response.json();
        setResults(data);
        setActiveIndex(-1);
        setOpen(true);
      } catch {
        // abgebrochene Requests ignorieren
      }
    }, debounceMs);

    return () => clearTimeout(timer);
  }, [query, debounceMs]);

  function detailLabel(result: SearchResult): string {
    switch (result.kind) {
      case "ore":
        return t(`ores.rarity.${result.detail}`);
      case "body":
        return t(`locations.bodyType.${result.detail}`);
      case "system":
        return t("locations.systemSuffix");
      case "blueprint":
        return t(`blueprints.category.${result.detail}`);
      case "signature":
        return t("search.signature", { value: result.detail });
    }
  }

  function select(result: SearchResult) {
    setOpen(false);
    setQuery("");
    router.push(result.href);
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (!open || results.length === 0) return;

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((index) => (index + 1) % results.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((index) => (index <= 0 ? results.length - 1 : index - 1));
    } else if (event.key === "Enter" && activeIndex >= 0) {
      event.preventDefault();
      select(results[activeIndex]);
    } else if (event.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <div className="relative w-full">
      <input
        role="combobox"
        type="search"
        value={query}
        onChange={(event) => {
          const value = event.target.value;
          setQuery(value);
          if (value.trim().length < MIN_QUERY_LENGTH) {
            setResults([]);
            setOpen(false);
          }
        }}
        onKeyDown={onKeyDown}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        aria-label={ariaLabel ?? t("search.label")}
        aria-expanded={open}
        aria-controls={listboxId}
        aria-activedescendant={
          activeIndex >= 0 ? `${listboxId}-${activeIndex}` : undefined
        }
        aria-autocomplete="list"
        placeholder={t("search.placeholder")}
        className={cn(
          "w-full rounded border border-bg-nebula-2 bg-bg-void px-3 py-1.5 text-sm transition-all duration-150 placeholder:text-text-muted focus:border-accent-primary focus:outline-none",
          inputClassName,
        )}
      />
      {open && (
        <ul
          id={listboxId}
          role="listbox"
          className="absolute top-full z-10 mt-1 w-full overflow-hidden rounded border border-bg-nebula-2 bg-bg-nebula shadow-lg"
        >
          {results.length === 0 ? (
            <li className="px-3 py-2 text-sm text-text-muted">
              {t("search.noResults")}
            </li>
          ) : (
            results.map((result, index) => (
              <li
                key={result.href + result.label}
                id={`${listboxId}-${index}`}
                role="option"
                aria-selected={index === activeIndex}
                onMouseDown={(event) => {
                  event.preventDefault();
                  select(result);
                }}
                onMouseEnter={() => setActiveIndex(index)}
                className={`flex cursor-pointer items-baseline justify-between gap-2 px-3 py-2 text-sm ${
                  index === activeIndex ? "bg-bg-nebula-2" : ""
                }`}
              >
                <span>{result.label}</span>
                <span className="text-xs text-text-muted">
                  {detailLabel(result)}
                </span>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
