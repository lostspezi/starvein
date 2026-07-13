import { screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { renderWithIntl } from "@/test/render";
import { EquipmentPurchasePanel } from "./EquipmentPurchasePanel";
import type { EquipmentPrice } from "./equipment-prices.schema";

const SYNCED_AT = "2026-07-13T09:00:00.000Z";

function price(overrides: Partial<EquipmentPrice> = {}): EquipmentPrice {
  return {
    equipmentCode: "helix-ii",
    kind: "laser",
    terminalId: 21,
    terminalName: "Dumper's Depot - Area18",
    locationLabel: "Area18 · ArcCorp · Stanton",
    priceBuy: 43500,
    syncedAt: SYNCED_AT,
    ...overrides,
  };
}

const helixEntry = {
  code: "helix-ii",
  kind: "laser" as const,
  name: "Helix II",
  quantity: 2,
  locations: [
    price({ terminalId: 22, terminalName: "Shubin SMO-10", priceBuy: 41000 }),
    price(),
  ],
};

const optimaxEntry = {
  code: "optimax",
  kind: "gadget" as const,
  name: "OptiMax",
  quantity: 1,
  locations: [
    price({
      equipmentCode: "optimax",
      kind: "gadget",
      terminalId: 40,
      terminalName: "Cubby Blast",
      locationLabel: "Everus Harbor · Hurston · Stanton",
      priceBuy: 4500,
    }),
  ],
};

describe("EquipmentPurchasePanel", () => {
  it("renders a price table per item with the cheapest row first", () => {
    renderWithIntl(
      <EquipmentPurchasePanel
        entries={[helixEntry, optimaxEntry]}
        syncedAt={SYNCED_AT}
      />,
      { locale: "en" },
    );

    expect(screen.getByRole("heading", { name: "Where to buy" })).toBeVisible();
    expect(screen.getByText("Helix II")).toBeVisible();
    expect(screen.getByText("×2")).toBeVisible();

    const helixSection = screen.getByRole("region", { name: /Helix II/ });
    const rows = within(helixSection).getAllByRole("row");
    expect(within(rows[1]).getByText("41,000")).toBeVisible();
    expect(within(rows[1]).getByText("Cheapest")).toBeVisible();
    expect(within(rows[2]).getByText("43,500")).toBeVisible();
  });

  it("shows the cheapest total when every item has data", () => {
    renderWithIntl(
      <EquipmentPurchasePanel
        entries={[helixEntry, optimaxEntry]}
        syncedAt={SYNCED_AT}
      />,
      { locale: "en" },
    );

    // 2× 41000 + 1× 4500 = 86500
    expect(screen.getByText("86,500")).toBeVisible();
    expect(screen.getByText(/Last synced/)).toBeVisible();
  });

  it("hides the total and shows a no-data line when an item lacks prices", () => {
    renderWithIntl(
      <EquipmentPurchasePanel
        entries={[helixEntry, { ...optimaxEntry, locations: [] }]}
        syncedAt={SYNCED_AT}
      />,
      { locale: "en" },
    );

    expect(
      screen.getByText("No purchase data for this item yet."),
    ).toBeVisible();
    expect(screen.queryByText("86,500")).toBeNull();
    expect(screen.queryByText(/Cheapest total/)).toBeNull();
  });

  it("renders only the never-synced note before the first sync", () => {
    renderWithIntl(
      <EquipmentPurchasePanel entries={[helixEntry]} syncedAt={null} />,
      { locale: "en" },
    );

    expect(
      screen.getByText("Purchase prices have not been synced from UEX yet."),
    ).toBeVisible();
    expect(screen.queryByRole("table")).toBeNull();
  });

  it("renders a dash for empty location labels", () => {
    renderWithIntl(
      <EquipmentPurchasePanel
        entries={[
          {
            ...optimaxEntry,
            locations: [
              price({
                equipmentCode: "optimax",
                kind: "gadget",
                locationLabel: "",
                priceBuy: 4500,
              }),
            ],
          },
        ]}
        syncedAt={SYNCED_AT}
      />,
      { locale: "en" },
    );

    expect(screen.getByText("—")).toBeVisible();
  });
});
