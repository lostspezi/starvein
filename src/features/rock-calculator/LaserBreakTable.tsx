"use client";

import { useFormatter, useTranslations } from "next-intl";
import type {
  MiningGadget,
  MiningLaser,
  MiningModule,
} from "@/features/loadouts/equipment.schema";
import {
  DataTable,
  DataTableHead,
  DataTableRow,
  DataTableTd,
  DataTableTh,
} from "@/lib/components/ui/DataTable";
import { headStats, headsNeeded } from "./rock-break";

/** Tabelle aller Ship-Laser mit Break-Urteil für den eingegebenen Stein. */
export function LaserBreakTable({
  lasers,
  modules,
  gadget,
  mass,
  resistancePct,
}: {
  lasers: MiningLaser[];
  modules: MiningModule[];
  gadget: MiningGadget | null;
  mass: number | null;
  resistancePct: number | null;
}) {
  const t = useTranslations("calculator");
  const format = useFormatter();

  if (mass === null || mass <= 0 || resistancePct === null) {
    return (
      <p className="py-6 text-center text-text-muted">{t("table.empty")}</p>
    );
  }

  const rock = { mass, resistancePct, modules, gadget };
  const rows = [...lasers]
    .sort((a, b) => a.size - b.size || a.name.localeCompare(b.name))
    .flatMap((laser) => {
      const head = headStats(laser, modules);
      if (head === null) return [];
      return [{ laser, head, result: headsNeeded(laser, rock) }];
    });

  return (
    <DataTable>
      <DataTableHead>
        <DataTableTh>{t("table.laser")}</DataTableTh>
        <DataTableTh className="hidden sm:table-cell">
          {t("table.size")}
        </DataTableTh>
        <DataTableTh className="text-right">{t("table.power")}</DataTableTh>
        {modules.length > 0 && (
          <DataTableTh className="hidden text-right sm:table-cell">
            {t("table.modules")}
          </DataTableTh>
        )}
        <DataTableTh>{t("table.heads")}</DataTableTh>
      </DataTableHead>
      <tbody>
        {rows.map(({ laser, head, result }) => (
          <DataTableRow key={laser.code}>
            <DataTableTd>
              {laser.name}
              <span className="ml-2 hidden text-xs text-text-muted md:inline">
                {laser.manufacturer}
              </span>
            </DataTableTd>
            <DataTableTd className="hidden font-mono sm:table-cell">
              S{laser.size}
            </DataTableTd>
            <DataTableTd className="text-right">
              <span className="font-mono text-accent-secondary">
                {format.number(Math.round(head.power))}
              </span>
            </DataTableTd>
            {modules.length > 0 && (
              <DataTableTd className="hidden text-right sm:table-cell">
                <span className="font-mono text-text-muted">
                  {Math.min(laser.moduleSlots, modules.length)}/{modules.length}
                </span>
              </DataTableTd>
            )}
            <DataTableTd>
              {result.canBreak && result.heads !== null ? (
                <span className="font-mono text-success">
                  {t("table.headsValue", { heads: result.heads })}
                </span>
              ) : (
                <span className="text-text-muted">
                  {t("table.notBreakable")}
                </span>
              )}
            </DataTableTd>
          </DataTableRow>
        ))}
      </tbody>
    </DataTable>
  );
}
