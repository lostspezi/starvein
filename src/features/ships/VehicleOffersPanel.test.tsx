import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { renderWithIntl } from "@/test/render";
import { VehicleOffersPanel } from "./VehicleOffersPanel";
import type { VehicleOffers } from "./vehicle-prices.read";
import type { VehiclePrice } from "./vehicle-prices.schema";

const SYNCED_AT = "2026-07-16T09:00:00.000Z";

const purchase: VehiclePrice = {
  vehicleCode: "prospector",
  offerType: "purchase",
  terminalId: 149,
  terminalName: "New Deal - Teasa Spaceport - Lorville",
  locationLabel: "Lorville · Hurston · Stanton",
  starSystemName: "Stanton",
  price: 2783020,
  syncedAt: SYNCED_AT,
};

const offers: VehicleOffers = {
  purchase: [purchase],
  rental: [],
};

describe("VehicleOffersPanel", () => {
  it("rendert Heading, Kauftabelle und noRental-Hinweis", () => {
    renderWithIntl(
      <VehicleOffersPanel offers={offers} syncedAt={SYNCED_AT} />,
      { locale: "en" },
    );

    expect(screen.getByRole("heading", { name: "Buy or rent" })).toBeVisible();
    expect(screen.getByText("2,783,020")).toBeVisible();
    expect(screen.getByText("Currently not rentable.")).toBeVisible();
    expect(screen.getByText(/Last synced:/)).toBeVisible();
  });

  it("zeigt nur den neverSynced-Hinweis, wenn nie gesynct wurde", () => {
    renderWithIntl(<VehicleOffersPanel offers={offers} syncedAt={null} />, {
      locale: "en",
    });
    expect(screen.getByText("No UEX price data synced yet.")).toBeVisible();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });
});
