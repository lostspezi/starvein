import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { renderWithIntl } from "@/test/render";
import { BlueprintList } from "./BlueprintList";
import type { Blueprint } from "./blueprints.schema";

const blueprints: Blueprint[] = [
  {
    key: "BP_CRAFT_AMRS_LaserCannon_S1",
    slug: "bp_craft_amrs_lasercannon_s1",
    wikiUuid: "26838ca7-418a-47d2-8429-7339ebbb8993",
    outputName: "Omnisky III Cannon",
    outputType: "WeaponGun",
    category: "ship-weapon",
    craftTimeSeconds: 540,
    isAvailableByDefault: false,
    ingredients: [
      { materialCode: "AGRI", kind: "resource", quantity: 0.36 },
      { materialCode: "HADA", kind: "item", quantity: 7 },
    ],
    gameVersion: "4.8.2-LIVE.12030094",
    sourceType: "wiki",
    syncedAt: "2026-07-16T00:00:00.000Z",
  },
];

describe("BlueprintList", () => {
  it("renders a row per blueprint with its produced item and raw type", () => {
    renderWithIntl(<BlueprintList blueprints={blueprints} />, { locale: "en" });
    expect(screen.getByText("Omnisky III Cannon")).toBeVisible();
    expect(screen.getByText("WeaponGun")).toBeVisible();
  });

  it("links each blueprint to its detail page via the slug", () => {
    renderWithIntl(<BlueprintList blueprints={blueprints} />, { locale: "en" });
    expect(
      screen.getByRole("link", { name: "Omnisky III Cannon" }),
    ).toHaveAttribute("href", "/blueprints/bp_craft_amrs_lasercannon_s1");
  });

  it("shows the localized category label", () => {
    renderWithIntl(<BlueprintList blueprints={blueprints} />, { locale: "de" });
    expect(screen.getByText("Schiffswaffe")).toBeVisible();
  });

  it("shows the ingredient count", () => {
    renderWithIntl(<BlueprintList blueprints={blueprints} />, { locale: "en" });
    expect(screen.getByText("2")).toBeVisible();
  });

  it("badges a collected blueprint", () => {
    renderWithIntl(
      <BlueprintList
        blueprints={blueprints}
        collectedKeys={new Set(["BP_CRAFT_AMRS_LaserCannon_S1"])}
      />,
      { locale: "en" },
    );
    expect(screen.getByText("Collected")).toBeVisible();
  });

  it("shows no collected badge for anonymous users", () => {
    renderWithIntl(<BlueprintList blueprints={blueprints} />, { locale: "en" });
    expect(screen.queryByText("Collected")).not.toBeInTheDocument();
  });

  it("shows an empty state when no blueprints match", () => {
    renderWithIntl(<BlueprintList blueprints={[]} />, { locale: "en" });
    expect(
      screen.getByText(
        "No blueprints found — adjust filters or run the wiki sync.",
      ),
    ).toBeVisible();
  });
});
