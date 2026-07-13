import { useTranslations } from "next-intl";
import { Badge } from "@/lib/components/ui/Badge";
import {
  DataTable,
  DataTableHead,
  DataTableRow,
  DataTableTd,
  DataTableTh,
} from "@/lib/components/ui/DataTable";
import {
  MODIFIER_KEYS,
  type MiningLaser,
  type MiningModule,
} from "./equipment.schema";
import type { AggregatedStats } from "./loadout-stats";

function formatFactor(factor: number): string {
  return `×${factor.toFixed(2)}`;
}

/**
 * Aufschlüsselung eines Hardpoints: Laser, Module (aktiv/passiv) und die
 * kombinierten Werte. Faktoren mit 1.0 (neutral) werden ausgeblendet,
 * Zahlen laufen in Mono/Blau als Messwerte (Design-System).
 */
export function HardpointBreakdown({
  index,
  laser,
  modules,
  stats,
}: {
  index: number;
  laser: MiningLaser;
  modules: MiningModule[];
  stats: AggregatedStats;
}) {
  const t = useTranslations("loadouts");

  const factorRows = MODIFIER_KEYS.filter(
    (key) => key !== "laserPower" && key !== "extractionLaserPower",
  )
    .map((key) => ({ key, value: stats[key] }))
    .filter((row) => row.value !== 1);

  return (
    <section aria-label={t("detail.hardpointHeading", { index })}>
      <div className="mb-2 flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h3 className="text-base font-medium">
          {t("detail.hardpointHeading", { index })}
        </h3>
        <span className="text-sm text-text-primary">{laser.name}</span>
        <span className="font-mono text-xs text-text-muted">S{laser.size}</span>
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-2 text-sm">
        <span className="text-text-muted">{t("detail.modulesHeading")}:</span>
        {modules.length === 0 ? (
          <span className="text-text-muted">{t("detail.noModules")}</span>
        ) : (
          modules.map((module, moduleIndex) => (
            <Badge key={`${module.code}-${moduleIndex}`}>
              {module.name}{" "}
              <span
                className={
                  module.type === "active" ? "text-warning" : "text-text-muted"
                }
              >
                (
                {t(
                  `detail.module${module.type === "active" ? "Active" : "Passive"}`,
                )}
                {module.type === "active" && module.charges !== null
                  ? `, ${t("detail.charges", { count: module.charges })}`
                  : ""}
                )
              </span>
            </Badge>
          ))
        )}
      </div>

      <DataTable>
        <DataTableHead>
          <DataTableTh>{t("detail.statHeader")}</DataTableTh>
          <DataTableTh className="text-right">
            {t("detail.valueHeader")}
          </DataTableTh>
        </DataTableHead>
        <tbody>
          {stats.laserPower !== null && (
            <DataTableRow>
              <DataTableTd>{t("stats.laserPower")}</DataTableTd>
              <DataTableTd className="text-right font-mono text-accent-secondary">
                {Math.round(stats.laserPower)}
              </DataTableTd>
            </DataTableRow>
          )}
          {stats.extractionLaserPower !== null && (
            <DataTableRow>
              <DataTableTd>{t("stats.extractionLaserPower")}</DataTableTd>
              <DataTableTd className="text-right font-mono text-accent-secondary">
                {Math.round(stats.extractionLaserPower)}
              </DataTableTd>
            </DataTableRow>
          )}
          <DataTableRow>
            <DataTableTd>{t("stats.optimalRange")}</DataTableTd>
            <DataTableTd className="text-right font-mono text-accent-secondary">
              {stats.optimalRange} m
            </DataTableTd>
          </DataTableRow>
          <DataTableRow>
            <DataTableTd>{t("stats.maxRange")}</DataTableTd>
            <DataTableTd className="text-right font-mono text-accent-secondary">
              {stats.maxRange} m
            </DataTableTd>
          </DataTableRow>
          {factorRows.map((row) => (
            <DataTableRow key={row.key}>
              <DataTableTd>{t(`stats.${row.key}`)}</DataTableTd>
              <DataTableTd className="text-right font-mono text-accent-secondary">
                {formatFactor(row.value)}
              </DataTableTd>
            </DataTableRow>
          ))}
        </tbody>
      </DataTable>

      {stats.laserPower === null && (
        <p className="mt-2 text-xs text-text-muted">
          {t("detail.normalizedPower")}
        </p>
      )}
    </section>
  );
}
