"use client";

import { useFormatter, useTranslations } from "next-intl";
import {
  DataTable,
  DataTableHead,
  DataTableRow,
  DataTableTd,
  DataTableTh,
} from "@/lib/components/ui/DataTable";
import { Panel } from "@/lib/components/ui/Panel";
import { PageViewsChart } from "./PageViewsChart";
import type { SeoAnalytics } from "./cloudflare-analytics.schema";

function Notice({ children }: { children: React.ReactNode }) {
  return (
    <Panel variant="glass" className="p-4">
      <p className="text-sm text-text-muted">{children}</p>
    </Panel>
  );
}

export function SeoPanel({ analytics }: { analytics: SeoAnalytics }) {
  const t = useTranslations("adminDashboard.seo");
  const format = useFormatter();

  return (
    <section className="space-y-4">
      <h2 className="text-sm font-medium text-text-primary">{t("title")}</h2>

      {!analytics.configured ? (
        <Notice>{t("notConfigured")}</Notice>
      ) : analytics.unavailable ? (
        <Notice>{t("unavailable")}</Notice>
      ) : analytics.totalPageViews === 0 ? (
        <Notice>{t("empty")}</Notice>
      ) : (
        <SeoContent analytics={analytics} t={t} format={format} />
      )}

      <p className="text-xs text-text-muted">{t("source")}</p>
    </section>
  );
}

function SeoContent({
  analytics,
  t,
  format,
}: {
  analytics: SeoAnalytics;
  t: (key: string) => string;
  format: ReturnType<typeof useFormatter>;
}) {
  const maxCountry = Math.max(1, ...analytics.countries.map((c) => c.views));

  return (
    <>
      <Panel variant="glass" className="p-4">
        <p className="mb-3 text-xs uppercase tracking-wide text-text-muted">
          {t("pageViews")}
        </p>
        <PageViewsChart data={analytics.pageViews} />
      </Panel>

      <div className="grid gap-4 lg:grid-cols-3">
        <Panel variant="glass" className="p-4">
          <p className="mb-3 text-xs uppercase tracking-wide text-text-muted">
            {t("countries")}
          </p>
          <ul className="space-y-2">
            {analytics.countries.map((country) => (
              <li key={country.country}>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-text-primary">{country.country}</span>
                  <span className="font-mono text-text-muted">
                    {format.number(country.views)}
                  </span>
                </div>
                <div className="mt-1 h-1.5 rounded-full bg-bg-nebula-2">
                  <div
                    className="h-full rounded-full bg-accent-cyan"
                    style={{ width: `${(country.views / maxCountry) * 100}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
        </Panel>

        <SeoTable
          title={t("referrers")}
          keyLabel={t("colReferrer")}
          valueLabel={t("colViews")}
          rows={analytics.referrers.map((r) => ({
            key: r.referrer,
            views: r.views,
          }))}
          format={format}
        />
        <SeoTable
          title={t("topPages")}
          keyLabel={t("colPage")}
          valueLabel={t("colViews")}
          rows={analytics.topPages.map((p) => ({
            key: p.path,
            views: p.views,
          }))}
          format={format}
        />
      </div>
    </>
  );
}

function SeoTable({
  title,
  keyLabel,
  valueLabel,
  rows,
  format,
}: {
  title: string;
  keyLabel: string;
  valueLabel: string;
  rows: { key: string; views: number }[];
  format: ReturnType<typeof useFormatter>;
}) {
  return (
    <div className="space-y-2">
      <p className="text-xs uppercase tracking-wide text-text-muted">{title}</p>
      <DataTable>
        <DataTableHead>
          <DataTableTh>{keyLabel}</DataTableTh>
          <DataTableTh className="text-right">{valueLabel}</DataTableTh>
        </DataTableHead>
        <tbody>
          {rows.map((row, index) => (
            <DataTableRow key={`${row.key}-${index}`}>
              <DataTableTd className="max-w-[16rem] truncate text-text-primary">
                {row.key}
              </DataTableTd>
              <DataTableTd className="text-right font-mono text-text-muted">
                {format.number(row.views)}
              </DataTableTd>
            </DataTableRow>
          ))}
        </tbody>
      </DataTable>
    </div>
  );
}
