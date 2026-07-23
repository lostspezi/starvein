"use client";

import { useTranslations } from "next-intl";
import {
  parseAsArrayOf,
  parseAsFloat,
  parseAsInteger,
  parseAsString,
  useQueryState,
} from "nuqs";
import type {
  MiningGadget,
  MiningLaser,
  MiningModule,
  MiningVehicle,
} from "@/features/loadouts/equipment.schema";
import type { Loadout } from "@/features/loadouts/loadouts.schema";
import { Panel } from "@/lib/components/ui/Panel";
import { CraftedBonusInput } from "./CraftedBonusInput";
import { LaserBreakTable } from "./LaserBreakTable";
import { ModuleGadgetPicker } from "./ModuleGadgetPicker";
import {
  CRAFTED_BONUS_MAX_PCT,
  CRAFTED_BONUS_MIN_PCT,
  MAX_GLOBAL_MODULES,
} from "./rock-break";
import { RockInputs } from "./RockInputs";
import { SavedLoadoutChecks } from "./SavedLoadoutChecks";

/**
 * Rechner-Wurzel: hält Masse/Resistenz/Module/Gadget als teilbare
 * URL-Query (nuqs, shallow) und komponiert Eingaben, Picker, Laser-Tabelle
 * und den Loadout-Abschnitt. Unbekannte Codes aus der URL werden gegen den
 * Katalog gefiltert, Resistenz wird auf 0–100 % geklemmt.
 */
export function RockCalculator({
  lasers,
  modules,
  gadgets,
  loadouts,
  vehicles,
}: {
  lasers: MiningLaser[];
  modules: MiningModule[];
  gadgets: MiningGadget[];
  /** null = nicht eingeloggt (Seite lädt Loadouts nur mit Session). */
  loadouts: Loadout[] | null;
  vehicles: MiningVehicle[];
}) {
  const t = useTranslations("calculator");
  const [mass, setMass] = useQueryState("mass", parseAsInteger);
  const [res, setRes] = useQueryState("res", parseAsFloat);
  const [moduleCodes, setModuleCodes] = useQueryState(
    "modules",
    parseAsArrayOf(parseAsString).withDefault([]),
  );
  const [gadgetCode, setGadgetCode] = useQueryState("gadget", parseAsString);
  const [bonus, setBonus] = useQueryState("bonus", parseAsFloat);

  const modulesByCode = new Map(modules.map((m) => [m.code, m]));
  const selectedModules = moduleCodes
    .flatMap((code) => modulesByCode.get(code) ?? [])
    .slice(0, MAX_GLOBAL_MODULES);
  const selectedGadget =
    gadgets.find((gadget) => gadget.code === gadgetCode) ?? null;

  const safeMass = mass !== null && mass > 0 ? mass : null;
  const safeRes = res === null ? null : Math.min(100, Math.max(0, res));
  const safeBonus =
    bonus === null
      ? null
      : Math.min(CRAFTED_BONUS_MAX_PCT, Math.max(CRAFTED_BONUS_MIN_PCT, bonus));
  const hasActiveModule = selectedModules.some((m) => m.type === "active");

  return (
    <div className="flex flex-col gap-6">
      <Panel className="flex flex-col gap-4 p-4">
        <RockInputs
          mass={safeMass}
          resistancePct={safeRes}
          onMassChange={setMass}
          onResistanceChange={setRes}
        />
        <ModuleGadgetPicker
          modules={modules}
          gadgets={gadgets}
          selectedModuleCodes={selectedModules.map((m) => m.code)}
          selectedGadgetCode={selectedGadget?.code ?? null}
          onModulesChange={(codes) =>
            setModuleCodes(codes.length === 0 ? null : codes)
          }
          onGadgetChange={setGadgetCode}
        />
        <CraftedBonusInput value={safeBonus} onChange={setBonus} />
        {hasActiveModule && (
          <p className="text-xs text-warning">{t("modules.activeHint")}</p>
        )}
      </Panel>

      <LaserBreakTable
        lasers={lasers}
        modules={selectedModules}
        gadget={selectedGadget}
        mass={safeMass}
        resistancePct={safeRes}
        laserPowerBonusPct={safeBonus ?? 0}
      />

      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-medium">{t("loadouts.title")}</h2>
        {loadouts === null ? (
          <p className="text-sm text-text-muted">
            {t("loadouts.loginRequired")}
          </p>
        ) : (
          <SavedLoadoutChecks
            loadouts={loadouts}
            vehicles={vehicles}
            lasers={lasers}
            modules={modules}
            gadget={selectedGadget}
            mass={safeMass}
            resistancePct={safeRes}
          />
        )}
      </section>
    </div>
  );
}
