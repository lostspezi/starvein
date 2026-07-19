import { useFormatter, useTranslations } from "next-intl";
import type { MiningMethod } from "@/features/ores/ores.schema";
import { signatureClusters } from "./signature-cluster";

/**
 * Detail-Inhalt fürs Aufklappen einer Tabellenzeile: der volle 1×–4×-
 * Cluster (Basis-RS × Anzahl Rocks/Deposits) plus die aktuellen roh/
 * raffiniert-Verkaufspreise. Ship-Signaturen identifizieren das Mineral,
 * ROC/FPS nur die Deposit-Größe — daher die abweichende Überschrift und der
 * Warnhinweis für Boden-Mining (CLAUDE.md §5).
 */
export function SignatureClusterPanel({
  method,
  signatureValue,
  signatureRange,
  dominantCompositionRange,
  rawSell,
  refinedSell,
  showPrices = true,
}: {
  method: MiningMethod;
  signatureValue?: number;
  signatureRange?: { min: number; max: number };
  dominantCompositionRange?: { min: number; max: number };
  rawSell: number | null;
  refinedSell: number | null;
  /** In der Erz-Liste stehen die Preise einmal je Erz, nicht je Methode. */
  showPrices?: boolean;
}) {
  const t = useTranslations("signatures");
  const format = useFormatter();

  const isShip = method === "ship";
  const clusters = signatureClusters({ signatureValue, signatureRange });

  const formatSell = (price: number | null) =>
    price === null ? "–" : format.number(price);

  return (
    <div className="flex animate-reveal flex-col gap-3">
      <div>
        <p className="text-sm font-medium">
          {t(isShip ? "cluster.shipTitle" : "cluster.depositTitle")}
        </p>
        {clusters.length > 0 ? (
          <div className="mt-1 flex flex-wrap gap-x-5 gap-y-1 font-mono">
            {clusters.map((cluster) => (
              <span
                key={cluster.count}
                className={isShip ? "text-accent-secondary" : "text-text-muted"}
              >
                <span className="mr-1 text-xs text-text-muted">
                  {t("cluster.multiplier", { n: cluster.count })}
                </span>
                {cluster.value !== undefined
                  ? format.number(cluster.value)
                  : `${format.number(cluster.range!.min)}–${format.number(
                      cluster.range!.max,
                    )}`}
              </span>
            ))}
          </div>
        ) : (
          <p className="mt-1 text-sm text-text-muted">—</p>
        )}
        {isShip && dominantCompositionRange && (
          <p className="mt-1 text-xs text-text-muted">
            {t("table.composition")}: {dominantCompositionRange.min}–
            {dominantCompositionRange.max}%
          </p>
        )}
        {!isShip && (
          <p className="mt-1 text-xs text-warning">{t("cluster.groundNote")}</p>
        )}
      </div>

      {showPrices && (
        <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm">
          <span>
            <span className="mr-1 text-text-muted">{t("cluster.sellRaw")}</span>
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
    </div>
  );
}
