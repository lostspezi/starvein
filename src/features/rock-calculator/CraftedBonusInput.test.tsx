import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { renderWithIntl } from "@/test/render";
import { CraftedBonusInput } from "./CraftedBonusInput";

function renderInput(
  overrides: Partial<React.ComponentProps<typeof CraftedBonusInput>> = {},
) {
  const onChange = vi.fn();
  renderWithIntl(
    <CraftedBonusInput value={null} onChange={onChange} {...overrides} />,
  );
  return { onChange };
}

describe("CraftedBonusInput", () => {
  it("renders a labeled number input with a scope hint", () => {
    renderInput();
    expect(
      screen.getByLabelText("Crafted laser power bonus (%)"),
    ).toBeVisible();
    expect(
      screen.getByText(
        "Applies to every laser in the table — saved loadouts use their own stored crafted bonuses instead.",
      ),
    ).toBeVisible();
  });

  it("reports the parsed bonus", async () => {
    const user = userEvent.setup();
    const { onChange } = renderInput();
    await user.type(
      screen.getByLabelText("Crafted laser power bonus (%)"),
      "9",
    );
    expect(onChange).toHaveBeenLastCalledWith(9);
  });

  it("reports null when the field is cleared", async () => {
    const user = userEvent.setup();
    const { onChange } = renderInput({ value: 29 });
    await user.clear(screen.getByLabelText("Crafted laser power bonus (%)"));
    expect(onChange).toHaveBeenLastCalledWith(null);
  });
});
