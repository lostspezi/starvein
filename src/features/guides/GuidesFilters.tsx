"use client";

import { Search, X } from "lucide-react";
import { useTranslations } from "next-intl";
import {
  parseAsArrayOf,
  parseAsString,
  parseAsStringLiteral,
  useQueryState,
} from "nuqs";
import { cn } from "@/lib/cn";
import { FilterGroup } from "@/lib/components/FilterGroup";
import { Panel } from "@/lib/components/ui/Panel";
import { GUIDE_SORTS } from "./guides.repository";
import { GUIDE_LANGUAGE_NAMES, type GuideLanguage } from "./guides.languages";

const chipBase = "rounded-full px-3 py-1 text-xs transition-all duration-150";
const chipActive = `${chipBase} bg-accent-primary font-medium text-bg-void shadow-glow-primary`;
const chipInactive = `${chipBase} border border-bg-nebula-2 text-text-muted hover:border-accent-cyan hover:text-text-primary`;

/**
 * Volltextsuche, Sprach-, Tag- (ODER) und Sortier-Filter der öffentlichen
 * Guide-Liste als URL-State (nuqs, shallow:false → Server-Komponente rendert
 * neu). Der Sprachfilter ist standardmäßig die Oberflächensprache; "Alle"
 * setzt lang=all explizit.
 */
export function GuidesFilters({
  tags,
  languages,
  defaultLanguage,
}: {
  tags: string[];
  languages: GuideLanguage[];
  defaultLanguage: GuideLanguage;
}) {
  const t = useTranslations("guides");
  const [q, setQ] = useQueryState(
    "q",
    parseAsString.withOptions({ shallow: false, throttleMs: 300 }),
  );
  const [lang, setLang] = useQueryState(
    "lang",
    parseAsString.withOptions({ shallow: false }),
  );
  const [selectedTags, setSelectedTags] = useQueryState(
    "tags",
    parseAsArrayOf(parseAsString)
      .withOptions({ shallow: false })
      .withDefault([]),
  );
  const [sort, setSort] = useQueryState(
    "sort",
    parseAsStringLiteral(GUIDE_SORTS).withOptions({ shallow: false }),
  );

  // Aktuelle Sprachauswahl: "all", eine Sprache, oder (kein Param) Default.
  const currentLang = lang ?? defaultLanguage;
  const hasFilters =
    Boolean(q) || selectedTags.length > 0 || Boolean(sort) || Boolean(lang);

  function chooseLang(value: "all" | GuideLanguage) {
    // Default-Sprache → Param entfernen (saubere URL); sonst explizit setzen
    setLang(value === defaultLanguage ? null : value);
  }

  function toggleTag(tag: string) {
    setSelectedTags((current) =>
      current.includes(tag)
        ? current.filter((value) => value !== tag)
        : [...current, tag],
    );
  }

  function clearAll() {
    setQ(null);
    setLang(null);
    setSelectedTags(null);
    setSort(null);
  }

  return (
    <Panel variant="glass" className="flex flex-col gap-4 p-4">
      <div className="relative sm:max-w-md">
        <Search
          aria-hidden
          className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-text-muted"
        />
        <input
          type="search"
          value={q ?? ""}
          onChange={(event) => setQ(event.target.value || null)}
          aria-label={t("browse.searchLabel")}
          placeholder={t("browse.searchPlaceholder")}
          className="w-full rounded border border-bg-nebula-2 bg-bg-void py-1.5 pr-3 pl-9 text-sm transition-all duration-150 placeholder:text-text-muted focus:border-accent-primary focus:outline-none"
        />
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between">
        <div
          role="group"
          aria-label={t("filter.languageLabel")}
          className="flex flex-col gap-1"
        >
          <span className="text-xs text-text-muted">
            {t("filter.languageLabel")}
          </span>
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              aria-pressed={lang === "all"}
              onClick={() => chooseLang("all")}
              className={cn(lang === "all" ? chipActive : chipInactive)}
            >
              {t("filter.allLanguages")}
            </button>
            {languages.map((language) => {
              const active = lang !== "all" && currentLang === language;
              return (
                <button
                  key={language}
                  type="button"
                  aria-pressed={active}
                  onClick={() => chooseLang(language)}
                  className={cn(active ? chipActive : chipInactive)}
                >
                  {GUIDE_LANGUAGE_NAMES[language]}
                </button>
              );
            })}
          </div>
        </div>

        {tags.length > 0 && (
          <div
            role="group"
            aria-label={t("filter.tagsLabel")}
            className="flex flex-col gap-1"
          >
            <span className="text-xs text-text-muted">
              {t("filter.tagsLabel")}
            </span>
            <div className="flex flex-wrap gap-1.5">
              {tags.map((tag) => {
                const active = selectedTags.includes(tag);
                return (
                  <button
                    key={tag}
                    type="button"
                    aria-pressed={active}
                    onClick={() => toggleTag(tag)}
                    className={cn(active ? chipActive : chipInactive)}
                  >
                    {tag}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div className="flex flex-col gap-1">
          <span className="text-xs text-text-muted">
            {t("filter.sortLabel")}
          </span>
          <FilterGroup
            label={t("filter.sortLabel")}
            options={GUIDE_SORTS}
            value={sort ?? "new"}
            onChange={(next) => setSort(next === "new" ? null : next)}
            optionLabel={(option) => t(`sort.${option}`)}
          />
        </div>
      </div>

      {hasFilters && (
        <button
          type="button"
          onClick={clearAll}
          className="flex items-center gap-1 self-start text-xs text-text-muted transition-colors duration-150 hover:text-accent-cyan"
        >
          <X aria-hidden className="size-3.5" />
          {t("filter.clear")}
        </button>
      )}
    </Panel>
  );
}
