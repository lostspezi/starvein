"use client";

import { useTranslations } from "next-intl";
import { useId, useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { cn } from "@/lib/cn";
import { FilterGroup } from "@/lib/components/FilterGroup";
import { Button } from "@/lib/components/ui/Button";
import { Panel, panelClasses } from "@/lib/components/ui/Panel";
import {
  compatibleLasers,
  validateLoadout,
  type EquipmentCatalog,
} from "./compatibility";
import {
  LOADOUT_METHODS,
  type LoadoutMethod,
  type MiningVehicle,
} from "./equipment.schema";
import { HardpointBreakdown } from "./HardpointBreakdown";
import { aggregateHardpointStats } from "./loadout-stats";
import {
  CRAFTED_BONUS_MAX_PCT,
  CRAFTED_BONUS_MIN_PCT,
  type LoadoutInput,
} from "./loadouts.schema";

const MAX_GADGETS = 3;

type Assignment = {
  laserCode: string;
  moduleCodes: string[];
  crafted: boolean;
  craftedBonusPct: number | null;
};

function clampBonus(pct: number): number {
  return Math.min(CRAFTED_BONUS_MAX_PCT, Math.max(CRAFTED_BONUS_MIN_PCT, pct));
}

const inputClass =
  "w-full rounded border border-bg-nebula-2 bg-bg-void px-3 py-1.5 text-sm transition-all duration-150 placeholder:text-text-muted focus:border-accent-primary focus:outline-none";

const selectClass =
  "rounded border border-bg-nebula-2 bg-bg-void px-2 py-1 text-sm focus:border-accent-primary focus:outline-none";

function initialAssignments(
  vehicle: MiningVehicle,
  catalog: EquipmentCatalog,
  existing?: LoadoutInput["hardpoints"],
): Assignment[] {
  return vehicle.hardpoints.map((hardpoint, index) => {
    const fromExisting = existing?.find((h) => h.hardpointIndex === index);
    if (fromExisting) {
      return {
        laserCode: fromExisting.laserCode,
        moduleCodes: [...fromExisting.moduleCodes],
        crafted: fromExisting.craftedBonusPct !== undefined,
        craftedBonusPct: fromExisting.craftedBonusPct ?? null,
      };
    }
    // Werks-Laser vorauswählen, sofern er auf diesen Hardpoint passt
    const stock = catalog.lasers.find(
      (laser) =>
        laser.code === vehicle.stockLaserCode && laser.size === hardpoint.size,
    );
    return {
      laserCode: stock?.code ?? "",
      moduleCodes: [],
      crafted: false,
      craftedBonusPct: null,
    };
  });
}

/**
 * Progressiver Loadout-Builder: Methode → Fahrzeug → pro Hardpoint ein
 * Laser (nur passende Größen) → Module (begrenzt durch Slots) → Gadgets →
 * Name/Sichtbarkeit, mit Live-Vorschau der kombinierten Werte.
 * Im Edit-Modus (loadoutId gesetzt) wird per PATCH gespeichert.
 */
export function LoadoutBuilder({
  catalog,
  initialValue,
  loadoutId,
}: {
  catalog: EquipmentCatalog;
  initialValue?: LoadoutInput;
  loadoutId?: string;
}) {
  const t = useTranslations("loadouts.builder");
  const tLoadouts = useTranslations("loadouts");
  const router = useRouter();
  const formId = useId();

  const initialVehicle = initialValue
    ? (catalog.vehicles.find((v) => v.code === initialValue.vehicleCode) ??
      null)
    : null;

  const [method, setMethod] = useState<LoadoutMethod>(
    initialValue?.method ?? "ship",
  );
  const [vehicle, setVehicle] = useState<MiningVehicle | null>(initialVehicle);
  const [assignments, setAssignments] = useState<Assignment[]>(
    initialVehicle
      ? initialAssignments(initialVehicle, catalog, initialValue?.hardpoints)
      : [],
  );
  const [gadgetCodes, setGadgetCodes] = useState<string[]>(
    initialValue?.gadgetCodes ?? [],
  );
  const [name, setName] = useState(initialValue?.name ?? "");
  const [description, setDescription] = useState(
    initialValue?.description ?? "",
  );
  const [isPublic, setIsPublic] = useState(initialValue?.isPublic ?? false);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  const lasersByCode = new Map(catalog.lasers.map((l) => [l.code, l]));
  const modulesByCode = new Map(catalog.modules.map((m) => [m.code, m]));
  const vehiclesForMethod = catalog.vehicles.filter((v) => v.method === method);

  function selectMethod(next: LoadoutMethod | null) {
    if (next === null || next === method) return;
    setMethod(next);
    setVehicle(null);
    setAssignments([]);
    setGadgetCodes([]);
  }

  function selectVehicle(next: MiningVehicle) {
    setVehicle(next);
    setAssignments(initialAssignments(next, catalog));
    if (!next.gadgetCapable) setGadgetCodes([]);
  }

  function setLaser(index: number, laserCode: string) {
    setAssignments((current) =>
      current.map((assignment, i) =>
        i === index
          ? {
              laserCode,
              moduleCodes: [],
              crafted: false,
              craftedBonusPct: null,
            }
          : assignment,
      ),
    );
  }

  function toggleCrafted(index: number) {
    setAssignments((current) =>
      current.map((assignment, i) =>
        i === index
          ? {
              ...assignment,
              crafted: !assignment.crafted,
              craftedBonusPct: null,
            }
          : assignment,
      ),
    );
  }

  function setCraftedBonus(index: number, value: number | null) {
    setAssignments((current) =>
      current.map((assignment, i) =>
        i === index ? { ...assignment, craftedBonusPct: value } : assignment,
      ),
    );
  }

  function setModule(index: number, slot: number, moduleCode: string) {
    setAssignments((current) =>
      current.map((assignment, i) => {
        if (i !== index) return assignment;
        const moduleCodes = [...assignment.moduleCodes];
        moduleCodes[slot] = moduleCode;
        return { ...assignment, moduleCodes };
      }),
    );
  }

  function toggleGadget(code: string) {
    setGadgetCodes((current) =>
      current.includes(code)
        ? current.filter((c) => c !== code)
        : current.length < MAX_GADGETS
          ? [...current, code]
          : current,
    );
  }

  function buildInput(): LoadoutInput {
    return {
      name: name.trim(),
      description: description.trim() || undefined,
      method,
      vehicleCode: vehicle?.code ?? "",
      hardpoints: assignments
        .map((assignment, index) => ({
          hardpointIndex: index,
          laserCode: assignment.laserCode,
          moduleCodes: assignment.moduleCodes.filter(Boolean),
          ...(assignment.crafted
            ? { craftedBonusPct: clampBonus(assignment.craftedBonusPct ?? 0) }
            : {}),
        }))
        .filter((assignment) => assignment.laserCode !== ""),
      gadgetCodes,
      isPublic,
    };
  }

  const input = buildInput();
  const validationErrors = vehicle ? validateLoadout(input, catalog) : ["_"];
  const canSubmit =
    !busy && input.name.length > 0 && validationErrors.length === 0;

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!canSubmit) return;
    setBusy(true);
    setFailed(false);
    try {
      const response = await fetch(
        loadoutId ? `/api/loadouts/${loadoutId}` : "/api/loadouts",
        {
          method: loadoutId ? "PATCH" : "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(buildInput()),
        },
      );
      if (!response.ok) {
        setFailed(true);
        return;
      }
      const saved: { id: string } = await response.json();
      router.push(`/loadouts/${saved.id}`);
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  }

  const filledHardpoints = assignments
    .map((assignment, index) => ({ assignment, index }))
    .filter(({ assignment }) => assignment.laserCode !== "");

  return (
    <form onSubmit={submit} className="flex flex-col gap-6">
      {loadoutId && (
        <p className="text-sm text-warning">{t("voteResetWarning")}</p>
      )}

      <FilterGroup
        label={t("methodLabel")}
        options={LOADOUT_METHODS}
        value={method}
        onChange={selectMethod}
        optionLabel={(m) => tLoadouts(`method.${m}`)}
      />

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 text-sm text-text-muted">
          {t("vehicleLabel")}
        </legend>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {vehiclesForMethod.map((candidate) => {
            const isActive = vehicle?.code === candidate.code;
            return (
              <button
                key={candidate.code}
                type="button"
                onClick={() => selectVehicle(candidate)}
                aria-pressed={isActive}
                aria-label={`${candidate.name} — ${candidate.manufacturer}`}
                className={cn(
                  panelClasses({ hover: !isActive }),
                  "p-3 text-left",
                  isActive && "border-accent-cyan shadow-glow-sm",
                )}
              >
                <span className="block font-medium">{candidate.name}</span>
                <span className="block text-xs text-text-muted">
                  {candidate.manufacturer}
                </span>
                <span className="mt-1 block font-mono text-xs text-text-muted">
                  {candidate.hardpoints.length > 0
                    ? candidate.hardpoints.map((h) => `S${h.size}`).join(" · ")
                    : "—"}
                </span>
              </button>
            );
          })}
        </div>
      </fieldset>

      {vehicle?.hardpoints.map((hardpoint, index) => {
        const assignment = assignments[index];
        const options = compatibleLasers(catalog.lasers, hardpoint.size);
        const laser = assignment?.laserCode
          ? lasersByCode.get(assignment.laserCode)
          : undefined;
        const laserSelectId = `${formId}-laser-${index}`;
        return (
          <Panel key={index} className="flex flex-col gap-3 p-4">
            <h3 className="text-sm font-medium">
              {t("hardpointHeading", {
                index: index + 1,
                size: hardpoint.size,
              })}
            </h3>
            <div className="flex flex-col gap-1">
              <label
                htmlFor={laserSelectId}
                className="text-xs text-text-muted"
              >
                {t("laserLabel", { index: index + 1 })}
              </label>
              <select
                id={laserSelectId}
                value={assignment?.laserCode ?? ""}
                onChange={(event) => setLaser(index, event.target.value)}
                className={selectClass}
              >
                <option value="">{t("laserNone")}</option>
                {options.map((option) => (
                  <option key={option.code} value={option.code}>
                    {option.name}
                  </option>
                ))}
              </select>
            </div>

            {laser && (
              <div className="flex flex-col gap-2">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={assignment?.crafted ?? false}
                    onChange={() => toggleCrafted(index)}
                    aria-label={t("craftedCheckboxLabel", { index: index + 1 })}
                  />
                  {t("craftedLabel")}
                </label>
                {assignment?.crafted && (
                  <div className="flex flex-col gap-1">
                    <label
                      htmlFor={`${formId}-crafted-${index}`}
                      className="text-xs text-text-muted"
                    >
                      {t("craftedBonusLabel", { index: index + 1 })}
                    </label>
                    <input
                      id={`${formId}-crafted-${index}`}
                      type="number"
                      inputMode="numeric"
                      min={CRAFTED_BONUS_MIN_PCT}
                      max={CRAFTED_BONUS_MAX_PCT}
                      placeholder="0"
                      value={assignment.craftedBonusPct ?? ""}
                      onChange={(event) => {
                        const parsed = Number.parseFloat(event.target.value);
                        // sofort klemmen, sonst blockiert die native
                        // min/max-Validation den Submit
                        setCraftedBonus(
                          index,
                          Number.isFinite(parsed) ? clampBonus(parsed) : null,
                        );
                      }}
                      className={cn(inputClass, "font-mono sm:max-w-48")}
                    />
                    <p className="text-xs text-text-muted">
                      {t("craftedHint")}
                    </p>
                  </div>
                )}
              </div>
            )}

            {laser && laser.moduleSlots > 0 && (
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                {Array.from({ length: laser.moduleSlots }, (_, slot) => {
                  const moduleSelectId = `${formId}-module-${index}-${slot}`;
                  return (
                    <div key={slot} className="flex flex-col gap-1">
                      <label
                        htmlFor={moduleSelectId}
                        className="text-xs text-text-muted"
                      >
                        {t("moduleLabel", {
                          slot: slot + 1,
                          index: index + 1,
                        })}
                      </label>
                      <select
                        id={moduleSelectId}
                        value={assignment?.moduleCodes[slot] ?? ""}
                        onChange={(event) =>
                          setModule(index, slot, event.target.value)
                        }
                        className={selectClass}
                      >
                        <option value="">{t("moduleNone")}</option>
                        {catalog.modules.map((module) => (
                          <option key={module.code} value={module.code}>
                            {module.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  );
                })}
              </div>
            )}
          </Panel>
        );
      })}

      {vehicle?.gadgetCapable && catalog.gadgets.length > 0 && (
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-2 text-sm text-text-muted">
            {t("gadgetsLegend")}
          </legend>
          <div className="flex flex-wrap gap-2">
            {catalog.gadgets.map((gadget) => {
              const isChecked = gadgetCodes.includes(gadget.code);
              return (
                <label
                  key={gadget.code}
                  className={cn(
                    "flex cursor-pointer items-center gap-2 rounded border px-2 py-1 text-sm transition-colors duration-150",
                    isChecked
                      ? "border-accent-cyan text-accent-cyan"
                      : "border-bg-nebula-2 text-text-muted hover:text-text-primary",
                  )}
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => toggleGadget(gadget.code)}
                    className="sr-only"
                  />
                  {gadget.name}
                </label>
              );
            })}
          </div>
        </fieldset>
      )}

      {filledHardpoints.length > 0 && (
        <Panel variant="glass" className="flex flex-col gap-4 p-4">
          <h2 className="text-base font-medium">{t("statsHeading")}</h2>
          {filledHardpoints.map(({ assignment, index }) => {
            const laser = lasersByCode.get(assignment.laserCode);
            if (!laser) return null;
            const modules = assignment.moduleCodes
              .filter(Boolean)
              .map((code) => modulesByCode.get(code))
              .filter((module) => module !== undefined);
            const craftedBonusPct = assignment.crafted
              ? clampBonus(assignment.craftedBonusPct ?? 0)
              : undefined;
            return (
              <HardpointBreakdown
                key={index}
                index={index + 1}
                laser={laser}
                modules={modules}
                stats={aggregateHardpointStats(
                  laser,
                  modules,
                  craftedBonusPct ?? 0,
                )}
                craftedBonusPct={craftedBonusPct}
              />
            );
          })}
        </Panel>
      )}

      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-1">
          <label htmlFor={`${formId}-name`} className="text-xs text-text-muted">
            {t("nameLabel")}
          </label>
          <input
            id={`${formId}-name`}
            type="text"
            value={name}
            maxLength={60}
            onChange={(event) => setName(event.target.value)}
            className={inputClass}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label
            htmlFor={`${formId}-description`}
            className="text-xs text-text-muted"
          >
            {t("descriptionLabel")}
          </label>
          <textarea
            id={`${formId}-description`}
            value={description}
            maxLength={500}
            rows={3}
            onChange={(event) => setDescription(event.target.value)}
            className={inputClass}
          />
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={isPublic}
            onChange={(event) => setIsPublic(event.target.checked)}
          />
          {t("isPublicLabel")}
        </label>
      </div>

      {failed && <p className="text-sm text-warning">{t("error")}</p>}

      <div>
        <Button type="submit" disabled={!canSubmit}>
          {t(loadoutId ? "submitSave" : "submitCreate")}
        </Button>
      </div>
    </form>
  );
}
