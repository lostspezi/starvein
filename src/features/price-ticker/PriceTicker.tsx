"use client";

import { ArrowDown, ArrowUp, Minus } from "lucide-react";
import { useFormatter, useLocale, useTranslations } from "next-intl";
import type { TickerEntry } from "./ticker.service";
import { usePriceTicker } from "./usePriceTicker";

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

function TickerItems({ entries }: { entries: TickerEntry[] }) {
  const locale = useLocale();
  const t = useTranslations("priceTicker");
  const format = useFormatter();

  return (
    <>
      {entries.map((entry) => (
        <span
          key={entry.oreCode}
          className="inline-flex items-center gap-1.5 whitespace-nowrap text-xs"
        >
          <span className="text-text-muted">
            {locale === "de" ? entry.nameDe : entry.nameEn}
          </span>
          <span className="font-mono text-accent-secondary">
            {format.number(entry.bestSell)}{" "}
            <span className="text-text-muted">{t("unit")}</span>
          </span>
          <DirectionIndicator entry={entry} />
        </span>
      ))}
    </>
  );
}

/**
 * Laufband unter dem Header: bester Refined-Sell je Erz mit
 * Vortagesindikator. Reine Client-Komponente (Muster ChatAside) — das
 * Root-Layout bleibt frei von DB-Zugriffen und damit statisch renderbar.
 * Rendert nichts, solange keine Daten da sind (Cold-Start, Fetch-Fehler).
 */
export function PriceTicker() {
  const entries = usePriceTicker();
  const t = useTranslations("priceTicker");

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

  return (
    <section
      aria-label={t("label")}
      className="ticker-viewport overflow-x-hidden border-b border-glass-border bg-glass backdrop-blur-md"
    >
      <div className="ticker-track flex h-7 w-max items-center gap-8 px-4">
        <TickerItems entries={entries} />
        {/* Zweite Kopie für den nahtlosen -50%-Loop — für AT unsichtbar */}
        <div aria-hidden="true" className="ticker-dup flex items-center gap-8">
          <TickerItems entries={entries} />
        </div>
      </div>
    </section>
  );
}
