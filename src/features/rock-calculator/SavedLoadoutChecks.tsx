"use client";

import { useTranslations } from "next-intl";
import type {
  MiningGadget,
  MiningLaser,
  MiningModule,
  MiningVehicle,
} from "@/features/loadouts/equipment.schema";
import type { Loadout } from "@/features/loadouts/loadouts.schema";
import { Badge } from "@/lib/components/ui/Badge";
import { panelClasses } from "@/lib/components/ui/Panel";
import { checkLoadout } from "./rock-break";

/**
 * Prüft die gespeicherten Loadouts des Nutzers gegen den eingegebenen
 * Stein. Das globale Rechner-Gadget gilt; gespeicherte Loadout-Gadgets
 * werden in v1 ignoriert (siehe gadgetNote).
 */
export function SavedLoadoutChecks({
  loadouts,
  vehicles,
  lasers,
  modules,
  gadget,
  mass,
  resistancePct,
}: {
  loadouts: Loadout[];
  vehicles: MiningVehicle[];
  lasers: MiningLaser[];
  modules: MiningModule[];
  gadget: MiningGadget | null;
  mass: number | null;
  resistancePct: number | null;
}) {
  const t = useTranslations("calculator");

  if (loadouts.length === 0) {
    return <p className="text-sm text-text-muted">{t("loadouts.empty")}</p>;
  }

  // Loadouts immer auflisten; das Verdict kommt erst mit gültigem Stein
  const hasRock = mass !== null && mass > 0 && resistancePct !== null;
  const catalog = {
    lasersByCode: new Map(lasers.map((laser) => [laser.code, laser])),
    modulesByCode: new Map(modules.map((module) => [module.code, module])),
  };
  const vehiclesByCode = new Map(
    vehicles.map((vehicle) => [vehicle.code, vehicle]),
  );

  return (
    <div className="flex flex-col gap-2">
      {!hasRock && (
        <p className="text-sm text-text-muted">{t("table.empty")}</p>
      )}
      <ul className="flex flex-col gap-2">
        {loadouts.map((loadout) => {
          const result = hasRock
            ? checkLoadout(loadout, catalog, { mass, resistancePct, gadget })
            : null;
          return (
            <li
              key={loadout.id}
              className={`${panelClasses()} flex flex-wrap items-center justify-between gap-3 p-3`}
            >
              <div className="flex flex-col">
                <span className="font-medium">{loadout.name}</span>
                <span className="text-sm text-text-muted">
                  {vehiclesByCode.get(loadout.vehicleCode)?.name ??
                    loadout.vehicleCode}
                </span>
              </div>
              {result === null ? (
                <span className="font-mono text-sm text-text-muted">—</span>
              ) : result.shipMining ? (
                <Badge tone={result.canBreak ? "success" : "warning"}>
                  {t(
                    result.canBreak ? "loadouts.breaks" : "loadouts.breaksNot",
                  )}
                </Badge>
              ) : (
                <Badge tone="default">{t("loadouts.notShipMining")}</Badge>
              )}
            </li>
          );
        })}
      </ul>
      <p className="text-xs text-text-muted">{t("loadouts.gadgetNote")}</p>
    </div>
  );
}
