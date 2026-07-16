import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { renderWithIntl } from "@/test/render";
import { OreBlueprintsPanel } from "./OreBlueprintsPanel";
import type { BlueprintUsingOre } from "./blueprints.service";

const entries: BlueprintUsingOre[] = [
  {
    blueprint: {
      key: "BP_CRAFT_AMRS_LaserCannon_S1",
      slug: "bp_craft_amrs_lasercannon_s1",
      wikiUuid: "26838ca7-418a-47d2-8429-7339ebbb8993",
      outputName: "Omnisky III Cannon",
      outputType: "WeaponGun",
      category: "ship-weapon",
      craftTimeSeconds: 540,
      isAvailableByDefault: false,
      ingredients: [{ materialCode: "AGRI", kind: "resource", quantity: 0.36 }],
      gameVersion: "4.8.2-LIVE.12030094",
      sourceType: "wiki",
      syncedAt: "2026-07-16T00:00:00.000Z",
    },
    viaMaterials: [
      {
        code: "AGRI",
        name: "Agricium",
        kind: "resource",
        oreCode: "AGRI",
        wikiUuid: "dc6fbcbb-5990-4ed5-82ee-93152dab7845",
        gameVersion: "4.8.2-LIVE.12030094",
        sourceType: "wiki",
        syncedAt: "2026-07-16T00:00:00.000Z",
      },
    ],
  },
];

describe("OreBlueprintsPanel", () => {
  it("links each blueprint to its detail page", () => {
    renderWithIntl(
      <OreBlueprintsPanel
        entries={entries}
        totalCount={1}
        materialCodes={["AGRI"]}
      />,
      { locale: "en" },
    );
    expect(
      screen.getByRole("link", { name: "Omnisky III Cannon" }),
    ).toHaveAttribute("href", "/blueprints/bp_craft_amrs_lasercannon_s1");
  });

  it("names the material that links the ore to the blueprint", () => {
    renderWithIntl(
      <OreBlueprintsPanel
        entries={entries}
        totalCount={1}
        materialCodes={["AGRI"]}
      />,
      { locale: "en" },
    );
    expect(screen.getByText("via Agricium")).toBeVisible();
  });

  /** Erze speisen bis zu 800+ Blueprints — der Rest muss erreichbar bleiben. */
  it("links to the filtered list when more blueprints exist than shown", () => {
    renderWithIntl(
      <OreBlueprintsPanel
        entries={entries}
        totalCount={830}
        materialCodes={["AGRI"]}
      />,
      { locale: "en" },
    );
    expect(
      screen.getByRole("link", { name: "Show all 830 blueprints" }),
    ).toHaveAttribute("href", "/blueprints?material=AGRI");
  });

  it("shows no 'show all' link when everything is already listed", () => {
    renderWithIntl(
      <OreBlueprintsPanel
        entries={entries}
        totalCount={1}
        materialCodes={["AGRI"]}
      />,
      { locale: "en" },
    );
    expect(screen.queryByText(/Show all/)).not.toBeInTheDocument();
  });

  it("shows an empty state when no blueprint uses the ore", () => {
    renderWithIntl(
      <OreBlueprintsPanel entries={[]} totalCount={0} materialCodes={[]} />,
      { locale: "en" },
    );
    expect(screen.getByText("No blueprint uses this ore.")).toBeVisible();
  });
});
