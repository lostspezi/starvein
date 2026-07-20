"use client";

import { useFormatter, useTranslations } from "next-intl";
import {
  DataTable,
  DataTableHead,
  DataTableRow,
  DataTableTd,
  DataTableTh,
} from "@/lib/components/ui/DataTable";
import { AnimatedNumber } from "@/lib/components/ui/AnimatedNumber";
import { Panel } from "@/lib/components/ui/Panel";
import { SignupTrendChart } from "./SignupTrendChart";
import type { RegistrationStats } from "./registrations.schema";

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <Panel variant="glass" className="p-4">
      <p className="text-xs uppercase tracking-wide text-text-muted">{label}</p>
      <AnimatedNumber
        value={value}
        className="mt-1 block font-mono text-2xl font-semibold text-text-primary"
      />
    </Panel>
  );
}

export function RegistrationsPanel({ stats }: { stats: RegistrationStats }) {
  const t = useTranslations("adminDashboard.registrations");
  const format = useFormatter();
  const maxProvider = Math.max(1, ...stats.byProvider.map((p) => p.count));

  return (
    <section className="space-y-4">
      <h2 className="text-sm font-medium text-text-primary">{t("title")}</h2>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <Stat label={t("total")} value={stats.totalUsers} />
        <Stat label={t("new24h")} value={stats.newLast24h} />
        <Stat label={t("new7d")} value={stats.newLast7d} />
        <Stat label={t("new30d")} value={stats.newLast30d} />
        <Stat label={t("activeSessions")} value={stats.activeSessions} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Panel variant="glass" className="p-4 lg:col-span-2">
          <p className="mb-3 text-xs uppercase tracking-wide text-text-muted">
            {t("trend")}
          </p>
          <SignupTrendChart data={stats.dailySignups} />
        </Panel>
        <Panel variant="glass" className="p-4">
          <p className="mb-3 text-xs uppercase tracking-wide text-text-muted">
            {t("byProvider")}
          </p>
          <ul className="space-y-2">
            {stats.byProvider.map((provider) => (
              <li key={provider.provider}>
                <div className="flex items-center justify-between text-sm">
                  <span className="capitalize text-text-primary">
                    {provider.provider}
                  </span>
                  <span className="font-mono text-text-muted">
                    {provider.count}
                  </span>
                </div>
                <div className="mt-1 h-1.5 rounded-full bg-bg-nebula-2">
                  <div
                    className="h-full rounded-full bg-accent-secondary"
                    style={{
                      width: `${(provider.count / maxProvider) * 100}%`,
                    }}
                  />
                </div>
              </li>
            ))}
          </ul>
        </Panel>
      </div>

      <div className="space-y-2">
        <p className="text-xs uppercase tracking-wide text-text-muted">
          {t("recent")}
        </p>
        {stats.recentSignups.length === 0 ? (
          <p className="text-sm text-text-muted">{t("noneRecent")}</p>
        ) : (
          <DataTable>
            <DataTableHead>
              <DataTableTh>{t("colName")}</DataTableTh>
              <DataTableTh>{t("colProvider")}</DataTableTh>
              <DataTableTh>{t("colDate")}</DataTableTh>
            </DataTableHead>
            <tbody>
              {stats.recentSignups.map((signup, index) => (
                <DataTableRow key={`${signup.name}-${index}`}>
                  <DataTableTd className="text-text-primary">
                    {signup.name}
                  </DataTableTd>
                  <DataTableTd className="capitalize text-text-muted">
                    {signup.provider ?? t("unknownProvider")}
                  </DataTableTd>
                  <DataTableTd className="font-mono text-text-muted">
                    {format.dateTime(new Date(signup.createdAt), {
                      dateStyle: "medium",
                    })}
                  </DataTableTd>
                </DataTableRow>
              ))}
            </tbody>
          </DataTable>
        )}
      </div>
    </section>
  );
}
