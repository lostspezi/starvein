import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NuqsTestingAdapter, type UrlUpdateEvent } from "nuqs/adapters/testing";
import { describe, expect, it, vi } from "vitest";
import { renderWithIntl } from "@/test/render";
import { ShipFilters } from "./ShipFilters";

const vehicles = [
  { code: "mole", name: "MOLE" },
  { code: "prospector", name: "Prospector" },
];

function renderFilters(searchParams = "") {
  const onUrlUpdate = vi.fn<(event: UrlUpdateEvent) => void>();
  renderWithIntl(
    <NuqsTestingAdapter searchParams={searchParams} onUrlUpdate={onUrlUpdate}>
      <ShipFilters vehicles={vehicles} />
    </NuqsTestingAdapter>,
    { locale: "en" },
  );
  return { onUrlUpdate };
}

describe("ShipFilters", () => {
  it("rendert Fahrzeug-Select und Angebotstyp-Gruppe", () => {
    renderFilters();
    expect(screen.getByRole("combobox", { name: "Vehicle" })).toBeVisible();
    expect(screen.getByRole("group", { name: "Offer" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Buy" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Rent" })).toBeVisible();
  });

  it("setzt den vehicle-Param über das Select", async () => {
    const user = userEvent.setup();
    const { onUrlUpdate } = renderFilters();

    await user.selectOptions(
      screen.getByRole("combobox", { name: "Vehicle" }),
      "mole",
    );

    const event = onUrlUpdate.mock.calls.at(-1)?.[0];
    expect(event?.searchParams.get("vehicle")).toBe("mole");
  });

  it("setzt den offer-Param auf rental", async () => {
    const user = userEvent.setup();
    const { onUrlUpdate } = renderFilters();

    await user.click(screen.getByRole("button", { name: "Rent" }));

    const event = onUrlUpdate.mock.calls.at(-1)?.[0];
    expect(event?.searchParams.get("offer")).toBe("rental");
  });
});
