import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { renderWithIntl } from "@/test/render";
import { MaterialList } from "./MaterialList";
import type { Material } from "./materials.schema";

const materials: Material[] = [
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
  {
    code: "PRESSURIZED_ICE",
    name: "Pressurized Ice",
    kind: "item",
    wikiUuid: "aaaaaaaa-0000-4000-8000-000000000001",
    gameVersion: "4.8.2-LIVE.12030094",
    sourceType: "wiki",
    syncedAt: "2026-07-16T00:00:00.000Z",
  },
];

describe("MaterialList", () => {
  it("renders a row per material with name and code", () => {
    renderWithIntl(<MaterialList materials={materials} />, { locale: "en" });
    expect(screen.getByText("Agricium")).toBeVisible();
    expect(screen.getByText("PRESSURIZED_ICE")).toBeVisible();
  });

  it("links each material to its detail page", () => {
    renderWithIntl(<MaterialList materials={materials} />, { locale: "en" });
    expect(screen.getByRole("link", { name: "Agricium" })).toHaveAttribute(
      "href",
      "/materials/agri",
    );
    expect(
      screen.getByRole("link", { name: "Pressurized Ice" }),
    ).toHaveAttribute("href", "/materials/pressurized_ice");
  });

  it("links an ore-backed material to the ore detail page", () => {
    renderWithIntl(<MaterialList materials={materials} />, { locale: "en" });
    expect(screen.getByRole("link", { name: "AGRI" })).toHaveAttribute(
      "href",
      "/ores/agri",
    );
  });

  it("shows the localized unit label per kind", () => {
    renderWithIntl(<MaterialList materials={materials} />, { locale: "de" });
    expect(screen.getByText("Rohstoff (SCU)")).toBeVisible();
    expect(screen.getByText("Item (Stück)")).toBeVisible();
  });

  it("shows a dash for a material with no ore", () => {
    renderWithIntl(<MaterialList materials={[materials[1]]} />, {
      locale: "en",
    });
    expect(screen.getByText("—")).toBeVisible();
  });

  it("shows an empty state when no materials match", () => {
    renderWithIntl(<MaterialList materials={[]} />, { locale: "en" });
    expect(
      screen.getByText(
        "No materials found — adjust filters or run the wiki sync.",
      ),
    ).toBeVisible();
  });
});
