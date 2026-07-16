import { screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { renderWithIntl } from "@/test/render";
import type { MiningVehicle } from "@/features/loadouts/equipment.schema";
import { VehicleOffersList } from "./VehicleOffersList";
import type { VehicleOffers } from "./vehicle-prices.read";
import type { VehiclePrice } from "./vehicle-prices.schema";

const SYNCED_AT = "2026-07-16T09:00:00.000Z";

const prospector: MiningVehicle = {
  code: "prospector",
  name: "Prospector",
  manufacturer: "MISC",
  method: "ship",
  hardpoints: [{ size: 1 }],
  gadgetCapable: true,
  stockLaserCode: "arbor-mh1",
  patchVersion: "4.7",
};

const rocDs: MiningVehicle = {
  code: "roc-ds",
  name: "ROC-DS",
  manufacturer: "Greycat Industrial",
  method: "roc",
  hardpoints: [{ size: 0 }],
  gadgetCapable: true,
  stockLaserCode: "s00-hofstede",
  patchVersion: "4.7",
};

function offer(overrides: Partial<VehiclePrice>): VehiclePrice {
  return {
    vehicleCode: "prospector",
    offerType: "purchase",
    terminalId: 149,
    terminalName: "New Deal - Teasa Spaceport - Lorville",
    locationLabel: "Lorville · Hurston · Stanton",
    starSystemName: "Stanton",
    price: 2783020,
    syncedAt: SYNCED_AT,
    ...overrides,
  };
}

const prospectorOffers: VehicleOffers = {
  purchase: [
    offer({
      terminalId: 148,
      terminalName: "Astro Armada - Area 18",
      locationLabel: "Area 18 · ArcCorp · Stanton",
      price: 2620000,
    }),
    offer({ price: 2783020 }),
  ],
  rental: [
    offer({
      offerType: "rental",
      terminalId: 157,
      terminalName: "Vantage Rentals - ARC-L1",
      locationLabel: "",
      price: 73237,
    }),
  ],
};

function renderList({
  vehicles = [prospector],
  offersByCode = new Map([["prospector", prospectorOffers]]),
  syncedAt = SYNCED_AT as string | null,
  offerType = null as "purchase" | "rental" | null,
} = {}) {
  return renderWithIntl(
    <VehicleOffersList
      vehicles={vehicles}
      offersByCode={offersByCode}
      syncedAt={syncedAt}
      offerType={offerType}
    />,
    { locale: "en" },
  );
}

describe("VehicleOffersList", () => {
  it("rendert pro Fahrzeug eine Section mit Kauf- und Miettabelle", () => {
    renderList();

    const section = screen.getByRole("region", { name: /Prospector/ });
    expect(within(section).getByText("MISC")).toBeVisible();

    const buyTable = within(section).getByRole("table", { name: "Buy" });
    expect(within(buyTable).getByText("Astro Armada - Area 18")).toBeVisible();
    expect(within(buyTable).getByText("2,620,000")).toBeVisible();

    const rentTable = within(section).getByRole("table", { name: "Rent" });
    expect(within(rentTable).getByText("73,237")).toBeVisible();
    expect(within(rentTable).getByText("aUEC/day")).toBeVisible();
  });

  it("markiert nur das günstigste Kaufangebot", () => {
    renderList();
    expect(screen.getAllByText("Cheapest")).toHaveLength(1);
  });

  it("rendert — für fehlende Ortsangaben", () => {
    renderList();
    const rentTable = screen.getByRole("table", { name: "Rent" });
    expect(within(rentTable).getByText("—")).toBeVisible();
  });

  it("zeigt noPurchase/noRental bei leeren Angebotslisten", () => {
    renderList({
      vehicles: [rocDs],
      offersByCode: new Map(),
    });
    expect(
      screen.getByText("Currently not purchasable in-game."),
    ).toBeVisible();
    expect(screen.getByText("Currently not rentable.")).toBeVisible();
  });

  it("zeigt nur den neverSynced-Hinweis, wenn nie gesynct wurde", () => {
    renderList({ syncedAt: null });
    expect(screen.getByText("No UEX price data synced yet.")).toBeVisible();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });

  it("blendet bei offerType=rental die Kauftabellen aus", () => {
    renderList({ offerType: "rental" });
    expect(
      screen.queryByRole("table", { name: "Buy" }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("table", { name: "Rent" })).toBeVisible();
  });

  it("zeigt lastSynced und Quelle im Footer", () => {
    renderList();
    expect(screen.getByText(/Last synced:/)).toBeVisible();
    expect(screen.getByText(/Data: UEX Corp/)).toBeVisible();
  });

  it("zeigt einen Empty-State ohne Fahrzeuge", () => {
    renderList({ vehicles: [], offersByCode: new Map() });
    expect(
      screen.getByText("No mining vehicles in the catalog."),
    ).toBeVisible();
  });
});
