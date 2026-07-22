import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NuqsTestingAdapter, type UrlUpdateEvent } from "nuqs/adapters/testing";
import { describe, expect, it, vi } from "vitest";
import type {
  MiningGadget,
  MiningLaser,
  MiningModule,
} from "@/features/loadouts/equipment.schema";
import { renderWithIntl } from "@/test/render";
import { RockCalculator } from "./RockCalculator";

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

const surge: MiningModule = {
  code: "surge",
  name: "Surge",
  manufacturer: "Thermyte Concern",
  type: "active",
  charges: 7,
  durationSeconds: 15,
  modifiers: { laserPower: 1.5, instability: 1.1, resistance: 0.85 },
  patchVersion,
};

const sabir: MiningGadget = {
  code: "sabir",
  name: "Sabir",
  manufacturer: "Shubin Interstellar",
  modifiers: { instability: 1.15, resistance: 0.5, optimalChargeWindow: 1.5 },
  patchVersion,
};

function renderCalculator(searchParams = "") {
  const onUrlUpdate = vi.fn<(event: UrlUpdateEvent) => void>();
  renderWithIntl(
    <NuqsTestingAdapter searchParams={searchParams} onUrlUpdate={onUrlUpdate}>
      <RockCalculator
        lasers={[helixII]}
        modules={[surge]}
        gadgets={[sabir]}
        loadouts={null}
        vehicles={[]}
      />
    </NuqsTestingAdapter>,
  );
  return { onUrlUpdate };
}

function rowOf(name: string) {
  return screen.getByText(name).closest("tr") as HTMLTableRowElement;
}

describe("RockCalculator", () => {
  it("renders the verdict for a deep-linked rock", () => {
    renderCalculator("?mass=30000&res=30");
    expect(within(rowOf("Helix II")).getByText("2×")).toBeInTheDocument();
  });

  it("applies deep-linked modules", () => {
    renderCalculator("?mass=30000&res=30&modules=surge,surge");
    expect(within(rowOf("Helix II")).getByText("1×")).toBeInTheDocument();
  });

  it("ignores unknown module and gadget codes from the URL", () => {
    renderCalculator("?mass=30000&res=30&modules=bogus&gadget=nope");
    expect(within(rowOf("Helix II")).getByText("2×")).toBeInTheDocument();
  });

  it("clamps out-of-range resistance values", () => {
    // Unclamped res=250 ergäbe 3×, clamped auf 100 % ergibt 2×
    renderCalculator("?mass=30000&res=250");
    expect(within(rowOf("Helix II")).getByText("2×")).toBeInTheDocument();
  });

  it("writes the mass to the URL", async () => {
    const user = userEvent.setup();
    const { onUrlUpdate } = renderCalculator();
    await user.type(screen.getByLabelText("Mass"), "5");
    expect(onUrlUpdate).toHaveBeenCalled();
    const event = onUrlUpdate.mock.calls.at(-1)?.[0];
    expect(event?.searchParams.get("mass")).toBe("5");
  });

  it("shows a sign-in hint instead of loadout checks for anonymous users", () => {
    renderCalculator("?mass=30000&res=30");
    expect(
      screen.getByText(
        "Sign in to check your saved loadouts against this rock.",
      ),
    ).toBeInTheDocument();
  });
});
