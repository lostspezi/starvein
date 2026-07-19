import { screen } from "@testing-library/react";
import { NuqsTestingAdapter } from "nuqs/adapters/testing";
import { describe, expect, it } from "vitest";
import { renderWithIntl } from "@/test/render";
import { CollectedBlueprintsSection } from "./CollectedBlueprintsSection";
import type { Blueprint } from "./blueprints.schema";
import type { CraftStatus } from "./craftability";
import type { CraftableBlueprint } from "./craftable-blueprints.service";
import type { Material } from "./materials.schema";

function blueprint(overrides: Partial<Blueprint>): Blueprint {
  return {
    key: "BP",
    slug: "bp",
    wikiUuid: "26838ca7-418a-47d2-8429-7339ebbb8993",
    outputName: "Omnisky III Cannon",
    outputType: "WeaponGun",
    category: "ship-weapon",
    craftTimeSeconds: 540,
    isAvailableByDefault: false,
    ingredients: [{ materialCode: "AGRI", kind: "resource", quantity: 0.36 }],
    gameVersion: "4.8",
    sourceType: "wiki",
    syncedAt: "2026-07-16T00:00:00.000Z",
    ...overrides,
  };
}

function entry(
  bp: Partial<Blueprint>,
  status: CraftStatus,
): CraftableBlueprint {
  return {
    blueprint: blueprint(bp),
    craftability: {
      status,
      maxCraftable: status === "craftable" ? 1 : 0,
      components: [],
    },
  };
}

const entries: CraftableBlueprint[] = [
  entry(
    {
      key: "A",
      slug: "a",
      outputName: "Omnisky III Cannon",
      category: "ship-weapon",
    },
    "craftable",
  ),
  entry(
    { key: "B", slug: "b", outputName: "Beacon Helmet", category: "armor" },
    "missing",
  ),
];

const materialsByCode: Record<string, Material> = {};

function renderSection(searchParams = "") {
  return renderWithIntl(
    <NuqsTestingAdapter searchParams={searchParams}>
      <CollectedBlueprintsSection
        entries={entries}
        materialsByCode={materialsByCode}
        emptyLabel="Nothing here"
      />
    </NuqsTestingAdapter>,
    { locale: "en" },
  );
}

describe("CollectedBlueprintsSection", () => {
  it("shows all collected blueprints without URL state", () => {
    renderSection();
    expect(screen.getByText("Omnisky III Cannon")).toBeVisible();
    expect(screen.getByText("Beacon Helmet")).toBeVisible();
  });

  it("filters by search query from the URL", () => {
    renderSection("?q=helmet");
    expect(screen.getByText("Beacon Helmet")).toBeVisible();
    expect(screen.queryByText("Omnisky III Cannon")).not.toBeInTheDocument();
  });

  it("filters by craft status from the URL", () => {
    renderSection("?status=craftable");
    expect(screen.getByText("Omnisky III Cannon")).toBeVisible();
    expect(screen.queryByText("Beacon Helmet")).not.toBeInTheDocument();
  });

  it("filters by category from the URL", () => {
    renderSection("?category=armor");
    expect(screen.getByText("Beacon Helmet")).toBeVisible();
    expect(screen.queryByText("Omnisky III Cannon")).not.toBeInTheDocument();
  });

  it("shows the empty label when filters exclude everything", () => {
    renderSection("?q=nonexistent");
    expect(screen.getByText("Nothing here")).toBeVisible();
  });
});
