"use client";

import { ArrowDown, ArrowUp, Minus } from "lucide-react";
import { useFormatter, useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { Link } from "@/i18n/navigation";
import type { TickerEntry } from "./ticker.service";
import { usePriceTicker } from "./usePriceTicker";

type TooltipState = {
  entry: TickerEntry;
  x: number;
  y: number;
};

function DirectionIndicator({ entry }: { entry: TickerEntry }) {
  const t = useTranslations("priceTicker");
  const format = useFormatter();

  // Kein Vortageswert (Cold-Start) — gar kein Indikator statt falscher Ruhe
  if (entry.direction === null) return null;

  // success/warning sind hier Zustandssemantik (gemessenes Delta zum
  // Vortag), keine Dekoration — siehe design-system/MASTER.md §2.
  if (entry.direction === "same") {
    return (
      <span className="inline-flex items-center text-text-muted">
        <Minus aria-hidden size={12} />
        <span className="sr-only">{t("same")}</span>
      </span>
    );
  }

  const up = entry.direction === "up";
  const percent =
    entry.changePercent === null
      ? null
      : `${up ? "+" : ""}${format.number(entry.changePercent, {
          maximumFractionDigits: 1,
        })}%`;

  return (
    <span
      className={`inline-flex items-center gap-0.5 ${up ? "text-success" : "text-warning"}`}
    >
      {up ? (
        <ArrowUp aria-hidden size={12} />
      ) : (
        <ArrowDown aria-hidden size={12} />
      )}
      {percent !== null && (
        <span className="font-mono text-[11px]">{percent}</span>
      )}
      <span className="sr-only">{t(entry.direction)}</span>
    </span>
  );
}

function TickerItems({
  entries,
  interactive,
  onShowTooltip,
  onHideTooltip,
}: {
  entries: TickerEntry[];
  /** false für die aria-hidden-Loopkopie: keine Tab-Stops, keine IDs */
  interactive: boolean;
  onShowTooltip: (entry: TickerEntry, target: HTMLElement) => void;
  onHideTooltip: () => void;
}) {
  const locale = useLocale();
  const t = useTranslations("priceTicker");
  const format = useFormatter();

  const sellAtText = (entry: TickerEntry): string => {
    const rest = entry.sellTerminalCount - entry.sellTerminals.length;
    const terminals = entry.sellTerminals.join(", ");
    return rest > 0
      ? `${t("sellAt")} ${terminals} ${t("moreTerminals", { count: rest })}`
      : `${t("sellAt")} ${terminals}`;
  };

  return (
    <>
      {entries.map((entry) => {
        const descriptionId = interactive
          ? `ticker-sell-${entry.oreCode}`
          : undefined;
        return (
          <span
            key={entry.oreCode}
            className="inline-flex items-center whitespace-nowrap text-xs"
          >
            <Link
              href={`/ores/${entry.oreCode.toLowerCase()}`}
              className="group inline-flex items-center gap-1.5"
              tabIndex={interactive ? undefined : -1}
              aria-describedby={descriptionId}
              onMouseEnter={
                interactive
                  ? (event) => onShowTooltip(entry, event.currentTarget)
                  : undefined
              }
              onMouseLeave={interactive ? onHideTooltip : undefined}
              onFocus={
                interactive
                  ? (event) => onShowTooltip(entry, event.currentTarget)
                  : undefined
              }
              onBlur={interactive ? onHideTooltip : undefined}
            >
              <span className="text-text-muted transition-colors duration-150 group-hover:text-accent-cyan group-hover:underline group-focus-visible:text-accent-cyan">
                {locale === "de" ? entry.nameDe : entry.nameEn}
              </span>
              <span className="font-mono text-accent-secondary">
                {format.number(entry.bestSell)}{" "}
                <span className="text-text-muted">{t("unit")}</span>
              </span>
              <DirectionIndicator entry={entry} />
            </Link>
            {interactive && (
              <span id={descriptionId} className="sr-only">
                {sellAtText(entry)}
              </span>
            )}
          </span>
        );
      })}
    </>
  );
}

/**
 * Laufband unter dem Header: bester Refined-Sell je Erz mit
 * Vortagesindikator; jeder Eintrag verlinkt auf die Erz-Detailseite und
 * zeigt bei Hover/Fokus die Bestpreis-Terminals. Reine Client-Komponente
 * (Muster ChatAside) — das Root-Layout bleibt frei von DB-Zugriffen und
 * damit statisch renderbar. Rendert nichts, solange keine Daten da sind.
 */
export function PriceTicker() {
  const entries = usePriceTicker();
  const t = useTranslations("priceTicker");
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);

  // Laden: höhengleicher Platzhalter, damit der Inhalt darunter nicht
  // springt, sobald die Einträge eintreffen (CLS/Klick-Stabilität).
  if (entries === null) {
    return (
      <div
        aria-hidden="true"
        className="ticker-viewport h-7 border-b border-glass-border bg-glass backdrop-blur-md"
      />
    );
  }

  // Bestätigt leer (nie gesynct / Fehler): gar keine Leiste
  if (entries.length === 0) return null;

  const showTooltip = (entry: TickerEntry, target: HTMLElement) => {
    const rect = target.getBoundingClientRect();
    setTooltip({ entry, x: rect.left + rect.width / 2, y: rect.bottom + 8 });
  };
  const hideTooltip = () => setTooltip(null);

  const rest = tooltip
    ? tooltip.entry.sellTerminalCount - tooltip.entry.sellTerminals.length
    : 0;

  return (
    <>
      <section
        aria-label={t("label")}
        className="ticker-viewport overflow-x-hidden border-b border-glass-border bg-glass backdrop-blur-md"
      >
        <div className="ticker-track flex h-7 w-max items-center gap-8 px-4">
          <TickerItems
            entries={entries}
            interactive
            onShowTooltip={showTooltip}
            onHideTooltip={hideTooltip}
          />
          {/* Zweite Kopie für den nahtlosen -50%-Loop — für AT unsichtbar */}
          <div
            aria-hidden="true"
            className="ticker-dup flex items-center gap-8"
          >
            <TickerItems
              entries={entries}
              interactive={false}
              onShowTooltip={showTooltip}
              onHideTooltip={hideTooltip}
            />
          </div>
        </div>
      </section>
      {/* Rein visuell (Screenreader bekommen aria-describedby); als
          Geschwister der Section gerendert, weil deren backdrop-filter
          sonst position:fixed einfangen und overflow-hidden clippen würde */}
      {tooltip && (
        <div
          aria-hidden="true"
          data-testid="ticker-tooltip"
          className="pointer-events-none fixed z-50 max-w-72 -translate-x-1/2 rounded border border-glass-border bg-bg-nebula-2 px-3 py-2 text-xs shadow-glow-sm"
          style={{ left: tooltip.x, top: tooltip.y }}
        >
          <p className="text-text-muted">{t("sellAt")}</p>
          <ul className="mt-1 space-y-0.5 text-text-primary">
            {tooltip.entry.sellTerminals.map((terminal) => (
              <li key={terminal}>{terminal}</li>
            ))}
          </ul>
          {rest > 0 && (
            <p className="mt-1 text-text-muted">
              {t("moreTerminals", { count: rest })}
            </p>
          )}
        </div>
      )}
    </>
  );
}
