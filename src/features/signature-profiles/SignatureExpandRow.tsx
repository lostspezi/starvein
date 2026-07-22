"use client";

import { useFormatter, useTranslations } from "next-intl";
import { useId, useState, type ReactNode } from "react";
import type { MiningMethod } from "@/features/ores/ores.schema";
import { cn } from "@/lib/cn";
import { DataTableRow, DataTableTd } from "@/lib/components/ui/DataTable";
import {
  SignatureClusterPanel,
  type DepositPanelData,
} from "./SignatureClusterPanel";

export type ClusterPanelData = {
  method: MiningMethod;
  signatureValue?: number;
  signatureRange?: { min: number; max: number };
  dominantCompositionRange?: { min: number; max: number };
  /** Haupt-/Nebenvorkommen inkl. Rock-Aufschlüsselung (nur Vorkommen-Zeilen). */
  deposit?: DepositPanelData;
};

/**
 * Aufklappbare Tabellenzeile mit Signatur-Cluster + Preisen. Der Detail-
 * Inhalt wird erst beim Öffnen clientseitig aus den (serialisierbaren)
 * Primitiv-Props gerendert — geschlossene Zeilen kosten so weder SSR-HTML
 * noch RSC-Payload (wichtig beim 200-Zeilen-Explorer). Der Chevron sitzt als
 * letzte Spalte, damit positionsbasierte Locators (Erz = Spalte 1) stabil
 * bleiben.
 *
 * `pricesInPanel` true (Standard): einzelnes Panel zeigt die Preise selbst
 * (Vorkommen-Tabellen). false: Preise einmal je Erz oben, dann ein Panel je
 * Methode ohne Preise (Erz-Liste).
 */
export function SignatureExpandRow({
  summary,
  colSpan,
  expandLabel,
  collapseLabel,
  className,
  id,
  panels,
  rawSell,
  refinedSell,
  pricesInPanel = true,
  emptyLabel,
}: {
  summary: ReactNode;
  /** Spaltenzahl inkl. Chevron-Spalte (für den Detail-colSpan). */
  colSpan: number;
  expandLabel: string;
  collapseLabel: string;
  className?: string;
  id?: string;
  panels: ClusterPanelData[];
  rawSell: number | null;
  refinedSell: number | null;
  pricesInPanel?: boolean;
  emptyLabel?: string;
}) {
  const t = useTranslations("signatures");
  const format = useFormatter();
  const [open, setOpen] = useState(false);
  const detailId = useId();

  const formatSell = (price: number | null) =>
    price === null ? "–" : format.number(price);

  return (
    <>
      <DataTableRow id={id} className={className}>
        {summary}
        <DataTableTd className="w-8 pl-0 text-center align-middle">
          <button
            type="button"
            aria-expanded={open}
            aria-controls={detailId}
            aria-label={open ? collapseLabel : expandLabel}
            onClick={() => setOpen((value) => !value)}
            className="cursor-pointer text-text-muted transition-colors duration-150 hover:text-accent-cyan"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 16 16"
              fill="none"
              aria-hidden="true"
              className={cn(
                "transition-transform duration-150",
                open && "rotate-90",
              )}
            >
              <path
                d="M6 4l4 4-4 4"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </DataTableTd>
      </DataTableRow>
      {open && (
        <tr className="border-b border-bg-nebula-2 bg-bg-void/40">
          <td id={detailId} colSpan={colSpan} className="px-4 py-3">
            <div className="flex animate-reveal flex-col gap-4">
              {!pricesInPanel && (
                <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm">
                  <span>
                    <span className="mr-1 text-text-muted">
                      {t("cluster.sellRaw")}
                    </span>
                    <span className="font-mono">{formatSell(rawSell)}</span>
                  </span>
                  <span>
                    <span className="mr-1 text-text-muted">
                      {t("cluster.sellRefined")}
                    </span>
                    <span className="font-mono">{formatSell(refinedSell)}</span>
                  </span>
                </div>
              )}
              {panels.length > 0
                ? panels.map((panel) => (
                    <SignatureClusterPanel
                      key={panel.method}
                      method={panel.method}
                      signatureValue={panel.signatureValue}
                      signatureRange={panel.signatureRange}
                      dominantCompositionRange={panel.dominantCompositionRange}
                      deposit={panel.deposit}
                      rawSell={pricesInPanel ? rawSell : null}
                      refinedSell={pricesInPanel ? refinedSell : null}
                      showPrices={pricesInPanel}
                    />
                  ))
                : emptyLabel && (
                    <p className="text-sm text-text-muted">{emptyLabel}</p>
                  )}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
