import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { renderWithIntl } from "@/test/render";
import { CraftableList } from "./CraftableList";
import type { Blueprint } from "./blueprints.schema";
import type { CraftableBlueprint } from "./craftable-blueprints.service";
import type { Material } from "./materials.schema";

const laser: Blueprint = {
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
};

const materialsByCode: Record<string, Material> = {
  AGRI: {
    code: "AGRI",
    name: "Agricium",
    kind: "resource",
    oreCode: "AGRI",
    wikiUuid: "dc6fbcbb-5990-4ed5-82ee-93152dab7845",
    gameVersion: "4.8.2-LIVE.12030094",
    sourceType: "wiki",
    syncedAt: "2026-07-16T00:00:00.000Z",
  },
  HADA: {
    code: "HADA",
    name: "Hadanite",
    kind: "item",
    oreCode: "HADA",
    wikiUuid: "125dd723-95ad-488d-830f-62c954445ca1",
    gameVersion: "4.8.2-LIVE.12030094",
    sourceType: "wiki",
    syncedAt: "2026-07-16T00:00:00.000Z",
  },
};

const craftable: CraftableBlueprint[] = [
  {
    blueprint: laser,
    craftability: {
      status: "craftable",
      maxCraftable: 3,
      components: [
        {
          materialCode: "AGRI",
          kind: "resource",
          required: 0.36,
          have: 1.1,
          shortfall: 0,
        },
      ],
    },
  },
];

const partial: CraftableBlueprint[] = [
  {
    blueprint: laser,
    craftability: {
      status: "partial",
      maxCraftable: 0,
      components: [
        {
          materialCode: "AGRI",
          kind: "resource",
          required: 0.36,
          have: 0.1,
          shortfall: 0.26,
        },
        {
          materialCode: "HADA",
          kind: "item",
          required: 7,
          have: 2,
          shortfall: 5,
        },
      ],
    },
  },
];

describe("CraftableList", () => {
  it("shows how often a craftable blueprint can be built", () => {
    renderWithIntl(
      <CraftableList
        entries={craftable}
        materialsByCode={materialsByCode}
        emptyLabel="none"
      />,
      { locale: "en" },
    );
    expect(screen.getByText("3× possible")).toBeVisible();
  });

  /** SCU-Engpässe müssen mit Einheit und Bruchmenge erscheinen. */
  it("names a missing SCU amount with its unit", () => {
    renderWithIntl(
      <CraftableList
        entries={partial}
        materialsByCode={materialsByCode}
        emptyLabel="none"
      />,
      { locale: "en" },
    );
    expect(screen.getByText("Missing 0.26 SCU Agricium")).toBeVisible();
  });

  it("names a missing item count with its unit", () => {
    renderWithIntl(
      <CraftableList
        entries={partial}
        materialsByCode={materialsByCode}
        emptyLabel="none"
      />,
      { locale: "en" },
    );
    expect(screen.getByText("Missing 5× Hadanite")).toBeVisible();
  });

  it("falls back to the material code when the material is unknown", () => {
    renderWithIntl(
      <CraftableList
        entries={partial}
        materialsByCode={{}}
        emptyLabel="none"
      />,
      { locale: "en" },
    );
    expect(screen.getByText("Missing 0.26 SCU AGRI")).toBeVisible();
  });

  it("links each blueprint to its detail page", () => {
    renderWithIntl(
      <CraftableList
        entries={craftable}
        materialsByCode={materialsByCode}
        emptyLabel="none"
      />,
      { locale: "en" },
    );
    expect(
      screen.getByRole("link", { name: "Omnisky III Cannon" }),
    ).toHaveAttribute("href", "/blueprints/bp_craft_amrs_lasercannon_s1");
  });

  it("shows the provided empty label when there are no entries", () => {
    renderWithIntl(
      <CraftableList
        entries={[]}
        materialsByCode={materialsByCode}
        emptyLabel="Nothing here"
      />,
      { locale: "en" },
    );
    expect(screen.getByText("Nothing here")).toBeVisible();
  });
});
