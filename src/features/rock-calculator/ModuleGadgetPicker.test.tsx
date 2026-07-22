import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type {
  MiningGadget,
  MiningModule,
} from "@/features/loadouts/equipment.schema";
import { renderWithIntl } from "@/test/render";
import { ModuleGadgetPicker } from "./ModuleGadgetPicker";

const patchVersion = "4.7";

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

const rieger: MiningModule = {
  code: "rieger",
  name: "Rieger",
  manufacturer: "Shubin Interstellar",
  type: "passive",
  charges: null,
  durationSeconds: null,
  modifiers: { laserPower: 1.15, optimalChargeWindow: 0.9 },
  patchVersion,
};

const sabir: MiningGadget = {
  code: "sabir",
  name: "Sabir",
  manufacturer: "Shubin Interstellar",
  modifiers: { instability: 1.15, resistance: 0.5, optimalChargeWindow: 1.5 },
  patchVersion,
};

function renderPicker(
  overrides: Partial<React.ComponentProps<typeof ModuleGadgetPicker>> = {},
) {
  const onModulesChange = vi.fn();
  const onGadgetChange = vi.fn();
  renderWithIntl(
    <ModuleGadgetPicker
      modules={[surge, rieger]}
      gadgets={[sabir]}
      selectedModuleCodes={[]}
      selectedGadgetCode={null}
      onModulesChange={onModulesChange}
      onGadgetChange={onGadgetChange}
      {...overrides}
    />,
  );
  return { onModulesChange, onGadgetChange };
}

describe("ModuleGadgetPicker", () => {
  it("renders three module slots and a gadget select", () => {
    renderPicker();
    expect(screen.getByLabelText("Module slot 1")).toBeVisible();
    expect(screen.getByLabelText("Module slot 2")).toBeVisible();
    expect(screen.getByLabelText("Module slot 3")).toBeVisible();
    expect(screen.getByLabelText("Gadget")).toBeVisible();
  });

  it("reports the module multiset (repeats allowed)", async () => {
    const user = userEvent.setup();
    const { onModulesChange } = renderPicker({
      selectedModuleCodes: ["surge"],
    });
    await user.selectOptions(screen.getByLabelText("Module slot 2"), "surge");
    expect(onModulesChange).toHaveBeenLastCalledWith(["surge", "surge"]);
  });

  it("drops a slot when it is reset to none", async () => {
    const user = userEvent.setup();
    const { onModulesChange } = renderPicker({
      selectedModuleCodes: ["surge", "rieger"],
    });
    await user.selectOptions(screen.getByLabelText("Module slot 1"), "");
    expect(onModulesChange).toHaveBeenLastCalledWith(["rieger"]);
  });

  it("reports the gadget selection and reset", async () => {
    const user = userEvent.setup();
    const { onGadgetChange } = renderPicker();
    await user.selectOptions(screen.getByLabelText("Gadget"), "sabir");
    expect(onGadgetChange).toHaveBeenLastCalledWith("sabir");
    await user.selectOptions(screen.getByLabelText("Gadget"), "");
    expect(onGadgetChange).toHaveBeenLastCalledWith(null);
  });
});
