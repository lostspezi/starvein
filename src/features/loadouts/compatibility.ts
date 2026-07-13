import type {
  LoadoutMethod,
  MiningGadget,
  MiningLaser,
  MiningModule,
  MiningVehicle,
} from "./equipment.schema";

export type EquipmentCatalog = {
  vehicles: MiningVehicle[];
  lasers: MiningLaser[];
  modules: MiningModule[];
  gadgets: MiningGadget[];
};

export type LoadoutContent = {
  method: LoadoutMethod;
  vehicleCode: string;
  hardpoints: {
    hardpointIndex: number;
    laserCode: string;
    moduleCodes: string[];
  }[];
  gadgetCodes: string[];
};

export function laserFitsHardpoint(
  laser: MiningLaser,
  hardpointSize: number,
): boolean {
  return laser.size === hardpointSize;
}

export function compatibleLasers(
  lasers: MiningLaser[],
  hardpointSize: number,
): MiningLaser[] {
  return lasers.filter((laser) => laserFitsHardpoint(laser, hardpointSize));
}

/**
 * Prüft ein Loadout gegen den Equipment-Katalog und liefert Fehlercodes
 * (leeres Array = gültig). Doppelte Module auf einem Laser sind erlaubt
 * (in-game legal), nur die Slot-Anzahl begrenzt.
 */
export function validateLoadout(
  input: LoadoutContent,
  catalog: EquipmentCatalog,
): string[] {
  const errors = new Set<string>();

  const vehicle = catalog.vehicles.find((v) => v.code === input.vehicleCode);
  if (!vehicle) {
    return ["unknownVehicle"];
  }
  if (vehicle.method !== input.method) {
    errors.add("methodMismatch");
  }

  const lasersByCode = new Map(catalog.lasers.map((l) => [l.code, l]));
  const moduleCodes = new Set(catalog.modules.map((m) => m.code));
  const gadgetCodes = new Set(catalog.gadgets.map((g) => g.code));

  const seenIndices = new Set<number>();
  for (const assignment of input.hardpoints) {
    const hardpoint = vehicle.hardpoints[assignment.hardpointIndex];
    if (assignment.hardpointIndex < 0 || !hardpoint) {
      errors.add("invalidHardpointIndex");
    }
    if (seenIndices.has(assignment.hardpointIndex)) {
      errors.add("duplicateHardpointIndex");
    }
    seenIndices.add(assignment.hardpointIndex);

    const laser = lasersByCode.get(assignment.laserCode);
    if (!laser) {
      errors.add("unknownLaser");
    } else {
      if (hardpoint && !laserFitsHardpoint(laser, hardpoint.size)) {
        errors.add("laserSizeMismatch");
      }
      if (assignment.moduleCodes.length > laser.moduleSlots) {
        errors.add("tooManyModules");
      }
    }
    for (const code of assignment.moduleCodes) {
      if (!moduleCodes.has(code)) {
        errors.add("unknownModule");
      }
    }
  }

  if (vehicle.hardpoints.length > 0 && input.hardpoints.length === 0) {
    errors.add("noLaserSelected");
  }

  if (input.gadgetCodes.length > 0 && !vehicle.gadgetCapable) {
    errors.add("gadgetsNotSupported");
  }
  for (const code of input.gadgetCodes) {
    if (!gadgetCodes.has(code)) {
      errors.add("unknownGadget");
    }
  }

  return [...errors];
}
