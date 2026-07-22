import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { renderWithIntl } from "@/test/render";
import { RockInputs } from "./RockInputs";

function renderInputs(
  overrides: Partial<React.ComponentProps<typeof RockInputs>> = {},
) {
  const onMassChange = vi.fn();
  const onResistanceChange = vi.fn();
  renderWithIntl(
    <RockInputs
      mass={null}
      resistancePct={null}
      onMassChange={onMassChange}
      onResistanceChange={onResistanceChange}
      {...overrides}
    />,
  );
  return { onMassChange, onResistanceChange };
}

describe("RockInputs", () => {
  it("renders labeled number inputs for mass and resistance", () => {
    renderInputs();
    expect(screen.getByLabelText("Mass")).toBeVisible();
    expect(screen.getByLabelText("Resistance (%)")).toBeVisible();
  });

  it("reports the parsed mass", async () => {
    const user = userEvent.setup();
    const { onMassChange } = renderInputs();
    await user.type(screen.getByLabelText("Mass"), "3");
    expect(onMassChange).toHaveBeenLastCalledWith(3);
  });

  it("reports null when the mass field is cleared", async () => {
    const user = userEvent.setup();
    const { onMassChange } = renderInputs({ mass: 5 });
    await user.clear(screen.getByLabelText("Mass"));
    expect(onMassChange).toHaveBeenLastCalledWith(null);
  });

  it("reports the resistance", async () => {
    const user = userEvent.setup();
    const { onResistanceChange } = renderInputs();
    await user.type(screen.getByLabelText("Resistance (%)"), "9");
    expect(onResistanceChange).toHaveBeenLastCalledWith(9);
  });
});
