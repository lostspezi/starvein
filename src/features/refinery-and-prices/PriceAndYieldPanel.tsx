import { useFormatter, useTranslations } from "next-intl";
import type { OrePriceSummary, PriceSide } from "./price-summary";
import type { RefineryYield } from "./refinery-and-prices.schema";

function formatBonus(bonusPercent: number): string {
  return `${bonusPercent < 0 ? "−" : "+"}${Math.abs(bonusPercent)}%`;
}

function PriceSideBlock({ label, side }: { label: string; side: PriceSide }) {
  const t = useTranslations("prices");
  const format = useFormatter();

  return (
    <div className="rounded border border-bg-nebula-2 bg-bg-void px-4 py-3">
      <span className="block text-sm text-text-muted">
        {label} · {t("bestSell")}
      </span>
      <span className="block font-mono text-2xl text-accent-secondary">
        {side.bestSell ? format.number(side.bestSell.priceSell) : "—"}
        <span className="ml-1 text-sm text-text-muted">{t("perScu")}</span>
      </span>
      {side.bestSell && (
        <span className="block text-sm text-text-muted">
          {side.bestSell.terminalName}
        </span>
      )}
    </div>
  );
}

export function PriceAndYieldPanel({
  summary,
  yields,
}: {
  summary: OrePriceSummary;
  yields: RefineryYield[];
}) {
  const t = useTranslations("prices");
  const format = useFormatter();

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-bg-nebula-2 bg-bg-nebula p-4">
      <h2 className="text-lg font-medium">{t("title")}</h2>

      {summary.syncedAt === null ? (
        <p className="text-sm text-text-muted">{t("neverSynced")}</p>
      ) : (
        <>
          {summary.raw === null && summary.refined === null ? (
            <p className="text-sm text-text-muted">{t("empty")}</p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {summary.raw && (
                <PriceSideBlock label={t("raw")} side={summary.raw} />
              )}
              {summary.refined && (
                <PriceSideBlock label={t("refined")} side={summary.refined} />
              )}
            </div>
          )}

          {yields.length > 0 && (
            <div>
              <h3 className="mb-2 text-sm font-medium">{t("yieldTitle")}</h3>
              <ul className="flex flex-col gap-1 text-sm">
                {yields.map((entry) => (
                  <li
                    key={entry.terminalId}
                    className="flex items-baseline justify-between gap-4"
                  >
                    <span className="text-text-muted">
                      {entry.terminalName}
                    </span>
                    <span
                      className={`font-mono ${
                        entry.bonusPercent >= 0
                          ? "text-success"
                          : "text-warning"
                      }`}
                    >
                      {formatBonus(entry.bonusPercent)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <p className="text-xs text-text-muted">
            {t("lastSynced", {
              date: format.dateTime(new Date(summary.syncedAt), {
                dateStyle: "medium",
                timeStyle: "short",
              }),
            })}{" "}
            · {t("source")}
          </p>
        </>
      )}
    </div>
  );
}
