"use client";

import { useFormatter, useTranslations } from "next-intl";
import { parseAsString, useQueryState } from "nuqs";
import { useId, useMemo, useState } from "react";
import { cn } from "@/lib/cn";
import { GlowLink } from "@/lib/components/ui/GlowLink";
import { Panel } from "@/lib/components/ui/Panel";
import { RARITY_TEXT_CLASS } from "@/lib/rarity";
import { SignatureClusterPanel } from "./SignatureClusterPanel";
import {
  matchScanValue,
  nodeKey,
  parseScanQuery,
  type ChartRow,
} from "./signature-chart.model";

type PriceMap = Record<string, { raw: number | null; refined: number | null }>;

/** Anteil der Track-Breite, den die Achse nutzt (Rest = Luft rechts fürs Pill). */
const USABLE = 94;
const GRID_FRACTIONS = [0.25, 0.5, 0.75, 1] as const;

/**
 * Interaktiver Signatur-Cluster-Chart ("Scanner-Readout"): jedes Erz ist eine
 * Zeile auf einer gemeinsamen RS-Achse, die Cluster-Summen (Basis × N Rocks)
 * sind leuchtende Knoten. Ein gescannter Wert entzündet die passenden Knoten
 * (Cyan = HUD-State) und nennt die erkannte Cluster-Größe (×N). Ship-Signaturen
 * identifizieren das Mineral; die generischen ROC/FPS-Tracks nur die Größe
 * (CLAUDE.md §5). Klick auf eine Zeile öffnet den Detail-Readout.
 */
export function SignatureChart({
  rows,
  axisMax,
  pricesByCode = {},
}: {
  rows: ChartRow[];
  axisMax: number;
  pricesByCode?: PriceMap;
}) {
  const t = useTranslations("signatures");
  const format = useFormatter();
  const helpId = useId();
  const [scan, setScan] = useQueryState("scan", parseAsString);
  const [openKey, setOpenKey] = useState<string | null>(null);

  const scanValue = scan ?? "";
  const { matchedRows, matchedNodes, hasQuery, isInvalid } = useMemo(() => {
    const query = parseScanQuery(scanValue);
    if (!query) {
      return {
        matchedRows: new Set<string>(),
        matchedNodes: new Set<string>(),
        hasQuery: false,
        isInvalid: scanValue.trim().length > 0,
      };
    }
    const matches = matchScanValue(query, rows);
    return {
      matchedRows: new Set(matches.map((m) => m.rowKey)),
      matchedNodes: new Set(matches.map((m) => nodeKey(m.rowKey, m.count))),
      hasQuery: true,
      isInvalid: false,
    };
  }, [scanValue, rows]);

  const leftFor = (value: number) =>
    axisMax > 0 ? (value / axisMax) * USABLE : 0;

  const status = (() => {
    if (isInvalid) return { text: t("chart.invalidInput"), tone: "muted" };
    if (!hasQuery) return null;
    if (matchedRows.size === 0)
      return { text: t("chart.noMatch"), tone: "warning" };
    return {
      text: t("chart.matchSummary", { count: matchedRows.size }),
      tone: "success",
    };
  })();

  const firstGroundIndex = rows.findIndex((r) => r.kind === "ground");

  return (
    <Panel
      variant="glass"
      className="flex animate-reveal flex-col gap-4 p-4 sm:p-5"
    >
      <div className="flex flex-col gap-1">
        <h2 className="text-sm font-medium uppercase tracking-[0.2em] text-accent-cyan">
          {t("chart.title")}
        </h2>
        <p className="text-sm text-text-muted">{t("chart.subtitle")}</p>
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="flex flex-col gap-1 text-sm sm:max-w-xs">
          <span className="text-text-muted">{t("chart.scanLabel")}</span>
          <input
            type="text"
            inputMode="numeric"
            autoComplete="off"
            value={scanValue}
            onChange={(event) => setScan(event.target.value || null)}
            placeholder={t("chart.scanPlaceholder")}
            aria-label={t("chart.scanLabel")}
            aria-describedby={helpId}
            className="w-full rounded border border-bg-nebula-2 bg-bg-void px-3 py-2 font-mono text-accent-secondary transition-colors duration-150 placeholder:text-text-muted focus:border-accent-cyan focus:shadow-glow-sm focus:outline-none"
          />
        </label>
        <p id={helpId} className="text-xs text-text-muted">
          {t("chart.scanHelp")}
        </p>
        <p
          aria-live="polite"
          className={cn(
            "min-h-5 text-sm font-medium",
            status?.tone === "warning" && "text-warning",
            status?.tone === "success" && "text-accent-cyan",
            status?.tone === "muted" && "text-text-muted",
          )}
        >
          {status?.text ?? ""}
        </p>
      </div>

      <div className="-mx-4 overflow-x-auto px-4 sm:-mx-5 sm:px-5">
        <div className="min-w-[860px]">
          {/* Achsen-Kopf mit RS-Ticks */}
          <div className="grid grid-cols-[9rem_1fr] items-end gap-3 pb-1">
            <span className="text-[10px] uppercase tracking-wider text-text-muted">
              {t("chart.axisLabel")}
            </span>
            <div className="relative h-4">
              {GRID_FRACTIONS.map((fraction) => (
                <span
                  key={fraction}
                  className="absolute -translate-x-1/2 font-mono text-[10px] text-text-muted"
                  style={{ left: `${fraction * USABLE}%` }}
                >
                  {format.number(Math.round((axisMax * fraction) / 100) * 100)}
                </span>
              ))}
            </div>
          </div>

          <ul className="flex flex-col">
            {rows.map((row, index) => {
              const isOpen = openKey === row.key;
              const isMatched = matchedRows.has(row.key);
              const detailId = `sig-chart-detail-${row.key}`;
              const label =
                row.kind === "ship"
                  ? row.oreName
                  : t(
                      row.track === "roc" ? "chart.rocTrack" : "chart.fpsTrack",
                    );
              const colorClass = RARITY_TEXT_CLASS[row.rarityTier];
              const firstLeft = leftFor(row.nodes[0]?.value ?? 0);
              const lastLeft = leftFor(row.nodes.at(-1)?.value ?? 0);
              const prices =
                pricesByCode[row.kind === "ship" ? row.oreCode : ""];

              return (
                <li key={row.key}>
                  {index === firstGroundIndex && (
                    <div className="mb-2 mt-4 flex items-center gap-3">
                      <span className="text-[10px] uppercase tracking-wider text-text-muted">
                        {t("chart.groundCaption")}
                      </span>
                      <span className="h-px flex-1 bg-glass-border" />
                    </div>
                  )}
                  <button
                    type="button"
                    data-matched={isMatched}
                    aria-expanded={isOpen}
                    aria-controls={detailId}
                    aria-label={t("chart.rowLabel", { name: label })}
                    onClick={() =>
                      setOpenKey((current) =>
                        current === row.key ? null : row.key,
                      )
                    }
                    className={cn(
                      "group grid w-full grid-cols-[9rem_1fr] items-center gap-3 rounded-md px-2 py-1.5 text-left transition-colors duration-150",
                      "hover:bg-bg-nebula-2/60",
                      isOpen && "bg-bg-nebula-2/70",
                      isMatched &&
                        "bg-accent-cyan/5 ring-1 ring-inset ring-accent-cyan/30",
                    )}
                  >
                    <span className="flex flex-col leading-tight">
                      <span
                        className={cn(
                          "truncate text-sm font-medium",
                          row.kind === "ship" ? colorClass : "text-text-muted",
                        )}
                      >
                        {label}
                      </span>
                      <span className="font-mono text-[11px] text-text-muted">
                        {format.number(row.baseValue)}
                        {row.kind === "ground" && ` × ${row.nodes.length}`}
                      </span>
                    </span>

                    <span className="relative h-9">
                      {/* Gridlines */}
                      {GRID_FRACTIONS.map((fraction) => (
                        <span
                          key={fraction}
                          aria-hidden
                          className="absolute inset-y-1 w-px bg-glass-border"
                          style={{ left: `${fraction * USABLE}%` }}
                        />
                      ))}
                      {/* Verbindungslinie */}
                      <span
                        aria-hidden
                        className={cn(
                          "absolute top-1/2 h-px -translate-y-1/2 bg-current opacity-30",
                          colorClass,
                        )}
                        style={{
                          left: `${firstLeft}%`,
                          width: `${Math.max(lastLeft - firstLeft, 0)}%`,
                        }}
                      />
                      {/* Knoten */}
                      {row.nodes.map((node) => {
                        const nodeMatched = matchedNodes.has(
                          nodeKey(row.key, node.count),
                        );
                        return (
                          <span
                            key={node.count}
                            className={cn(
                              "absolute top-1/2 -translate-x-1/2 -translate-y-1/2",
                              colorClass,
                            )}
                            style={{ left: `${leftFor(node.value)}%` }}
                          >
                            {nodeMatched && (
                              <span className="absolute -top-4 left-1/2 -translate-x-1/2 whitespace-nowrap font-mono text-[10px] font-semibold text-accent-cyan">
                                ×{node.count}
                              </span>
                            )}
                            <span
                              className={cn(
                                "block rounded-full border bg-bg-void px-2 py-0.5 text-center font-mono text-[11px] transition-all duration-150",
                                nodeMatched
                                  ? "scale-110 border-accent-cyan text-accent-cyan shadow-glow-sm"
                                  : "border-current/40 text-text-primary group-hover:border-current/70",
                              )}
                            >
                              {format.number(node.value)}
                            </span>
                          </span>
                        );
                      })}
                    </span>
                  </button>

                  {isOpen && (
                    <div
                      id={detailId}
                      className="animate-reveal px-2 pb-3 pt-1"
                    >
                      <div className="flex flex-col gap-3 rounded-md border border-bg-nebula-2 bg-bg-void/50 p-3">
                        <SignatureClusterPanel
                          method={row.method}
                          signatureValue={row.baseValue}
                          dominantCompositionRange={
                            row.kind === "ship"
                              ? row.dominantCompositionRange
                              : undefined
                          }
                          rawSell={prices?.raw ?? null}
                          refinedSell={prices?.refined ?? null}
                          showPrices={row.kind === "ship" && prices != null}
                        />
                        {row.kind === "ship" && row.notes && (
                          <p className="text-xs text-text-muted">
                            {t("table.secondaries")}: {row.notes}
                          </p>
                        )}
                        {row.kind === "ship" && (
                          <GlowLink
                            href={`/ores/${row.oreCode.toLowerCase()}`}
                            className="text-sm"
                          >
                            {t("chart.viewOre")}
                          </GlowLink>
                        )}
                      </div>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </Panel>
  );
}
