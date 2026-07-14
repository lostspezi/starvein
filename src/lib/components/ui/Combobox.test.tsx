import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { renderWithIntl } from "@/test/render";
import { Combobox } from "./Combobox";

const OPTIONS = [
  { value: "QUAN", label: "Quantainium", detail: "legendary" },
  { value: "GOLD", label: "Gold", detail: "uncommon" },
  { value: "TARA", label: "Taranite", detail: "rare" },
];

function renderCombobox(value = "", onChange = vi.fn()) {
  renderWithIntl(
    <Combobox
      id="ore"
      ariaLabel="Ore"
      options={OPTIONS}
      value={value}
      onChange={onChange}
      placeholder="Type to search"
      noResultsLabel="No matches"
    />,
    { locale: "en" },
  );
  return onChange;
}

describe("Combobox", () => {
  it("shows the selected option's label", () => {
    renderCombobox("GOLD");

    expect(screen.getByRole("combobox", { name: "Ore" })).toHaveValue("Gold");
  });

  it("opens with all options on focus", async () => {
    const user = userEvent.setup();
    renderCombobox();

    await user.click(screen.getByRole("combobox", { name: "Ore" }));

    expect(screen.getAllByRole("option")).toHaveLength(3);
  });

  it("filters while typing and selects on click", async () => {
    const user = userEvent.setup();
    const onChange = renderCombobox();

    await user.type(screen.getByRole("combobox", { name: "Ore" }), "tara");

    expect(screen.getAllByRole("option")).toHaveLength(1);

    await user.click(screen.getByRole("option", { name: /Taranite/ }));

    expect(onChange).toHaveBeenCalledWith("TARA");
  });

  it("selects via arrow keys and Enter", async () => {
    const user = userEvent.setup();
    const onChange = renderCombobox();

    const input = screen.getByRole("combobox", { name: "Ore" });
    await user.type(input, "a");
    await user.keyboard("{ArrowDown}{ArrowDown}{Enter}");

    // "a" matcht Quantainium, Gold(?) nein — Quantainium, Taranite
    expect(onChange).toHaveBeenCalledWith("TARA");
  });

  it("shows a no-results message", async () => {
    const user = userEvent.setup();
    renderCombobox();

    await user.type(screen.getByRole("combobox", { name: "Ore" }), "xyz");

    expect(screen.getByText("No matches")).toBeVisible();
    expect(screen.queryByRole("option")).not.toBeInTheDocument();
  });

  it("reverts a dangling draft on blur", async () => {
    const user = userEvent.setup();
    renderCombobox("GOLD");

    const input = screen.getByRole("combobox", { name: "Ore" });
    await user.clear(input);
    await user.type(input, "tar");
    await user.tab();

    await vi.waitFor(() => expect(input).toHaveValue("Gold"));
  });

  it("deselects when the input is cleared and blurred", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    renderCombobox("GOLD", onChange);

    await user.clear(screen.getByRole("combobox", { name: "Ore" }));
    await user.tab();

    await vi.waitFor(() => expect(onChange).toHaveBeenCalledWith(""));
  });
});
