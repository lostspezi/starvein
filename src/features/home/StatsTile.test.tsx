import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { renderWithIntl } from "@/test/render";
import { StatsTile } from "./StatsTile";

describe("StatsTile", () => {
  it("shows heading, labels and locale-formatted counts", () => {
    renderWithIntl(
      <StatsTile
        oreCount={42}
        locationCount={1234}
        blueprintCount={1559}
        communityCount={17}
      />,
      { locale: "en" },
    );

    expect(screen.getByRole("heading", { name: "The database" })).toBeVisible();
    expect(screen.getByText("Ores")).toBeVisible();
    expect(screen.getByText("Locations")).toBeVisible();
    expect(screen.getByText("Blueprints")).toBeVisible();
    expect(screen.getByText("Loadouts + guides")).toBeVisible();
    expect(screen.getByText("42")).toBeVisible();
    expect(screen.getByText("1,234")).toBeVisible();
    expect(screen.getByText("1,559")).toBeVisible();
    expect(screen.getByText("17")).toBeVisible();
  });

  it("translates labels and number format in German", () => {
    renderWithIntl(
      <StatsTile
        oreCount={42}
        locationCount={1234}
        blueprintCount={1559}
        communityCount={17}
      />,
      { locale: "de" },
    );

    expect(screen.getByText("Erze")).toBeVisible();
    expect(screen.getByText("Loadouts + Guides")).toBeVisible();
    expect(screen.getByText("1.234")).toBeVisible();
    expect(screen.getByText("1.559")).toBeVisible();
  });
});
