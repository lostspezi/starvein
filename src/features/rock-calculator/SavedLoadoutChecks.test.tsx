import { screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type {
  MiningLaser,
  MiningModule,
  MiningVehicle,
} from "@/features/loadouts/equipment.schema";
import type { Loadout } from "@/features/loadouts/loadouts.schema";
import { renderWithIntl } from "@/test/render";
import { SavedLoadoutChecks } from "./SavedLoadoutChecks";

const patchVersion = "4.7";

const helixII: MiningLaser = {
  code: "helix-ii",
  name: "Helix II",
  manufacturer: "Thermyte Concern",
  size: 2,
  moduleSlots: 3,
  stats: {
    laserPower: 4080,
    extractionLaserPower: 2590,
    optimalRange: 30,
    maxRange: 90,
  },
  modifiers: { resistance: 0.7 },
  patchVersion,
};

const mole: MiningVehicle = {
  code: "mole",
  name: "ARGO MOLE",
  manufacturer: "ARGO Astronautics",
  method: "ship",
  hardpoints: [{ size: 2 }, { size: 2 }, { size: 2 }],
  gadgetCapable: true,
  patchVersion,
};

function loadout(overrides: Partial<Loadout> = {}): Loadout {
  return {
    id: "loadout-1",
    name: "Break-MOLE",
    method: "ship",
    vehicleCode: "mole",
    hardpoints: [
      { hardpointIndex: 0, laserCode: "helix-ii", moduleCodes: [] },
      { hardpointIndex: 1, laserCode: "helix-ii", moduleCodes: [] },
      { hardpointIndex: 2, laserCode: "helix-ii", moduleCodes: [] },
    ],
    gadgetCodes: [],
    ownerUserId: "user-1",
    isPublic: false,
    votes: { up: 0 },
    voters: [],
    patchVersion,
    createdAt: "2026-07-22T00:00:00.000Z",
    updatedAt: "2026-07-22T00:00:00.000Z",
    ...overrides,
  };
}

function renderChecks(
  overrides: Partial<React.ComponentProps<typeof SavedLoadoutChecks>> = {},
) {
  renderWithIntl(
    <SavedLoadoutChecks
      loadouts={[loadout()]}
      vehicles={[mole]}
      lasers={[helixII]}
      modules={[] as MiningModule[]}
      gadget={null}
      mass={30000}
      resistancePct={30}
      {...overrides}
    />,
  );
}

describe("SavedLoadoutChecks", () => {
  it("shows a passing verdict with loadout and vehicle name", () => {
    renderChecks();
    const row = screen.getByText("Break-MOLE").closest("li") as HTMLElement;
    expect(within(row).getByText("ARGO MOLE")).toBeInTheDocument();
    // MOLE 3× Helix II schafft required 2675.4 bei 12240 verfügbar
    expect(within(row).getByText("Breaks the rock")).toBeInTheDocument();
  });

  it("shows a failing verdict when the loadout is too weak", () => {
    renderChecks({
      loadouts: [
        loadout({
          name: "Solo-Prospector",
          vehicleCode: "prospector",
          hardpoints: [
            { hardpointIndex: 0, laserCode: "helix-ii", moduleCodes: [] },
          ],
        }),
      ],
      mass: 100000,
      resistancePct: 50,
    });
    expect(screen.getByText("Not enough")).toBeInTheDocument();
  });

  it("labels non-ship loadouts instead of judging them", () => {
    renderChecks({
      loadouts: [loadout({ name: "ROC-Runner", method: "roc" })],
    });
    expect(screen.getByText("Not ship mining")).toBeInTheDocument();
    expect(screen.queryByText("Breaks the rock")).not.toBeInTheDocument();
  });

  it("shows an empty state without saved loadouts", () => {
    renderChecks({ loadouts: [] });
    expect(screen.getByText("No loadouts saved yet.")).toBeInTheDocument();
  });

  it("waits for a valid rock before judging", () => {
    renderChecks({ mass: null });
    expect(screen.queryByText("Breaks the rock")).not.toBeInTheDocument();
    expect(screen.getByText("Enter mass and resistance")).toBeInTheDocument();
  });
});
