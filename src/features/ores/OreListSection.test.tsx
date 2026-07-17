import { screen } from "@testing-library/react";
import { NuqsTestingAdapter } from "nuqs/adapters/testing";
import { describe, expect, it } from "vitest";
import { renderWithIntl } from "@/test/render";
import type { Ore } from "./ores.schema";
import { OreListSection } from "./OreListSection";

const ores: Ore[] = [
  {
    code: "QUAN",
    name_de: "Quantainium",
    name_en: "Quantainium",
    rarityTier: "legendary",
    mineableBy: { ship: true, roc: false, fps: false },
  },
  {
    code: "HADA",
    name_de: "Hadanit",
    name_en: "Hadanite",
    rarityTier: "epic",
    mineableBy: { ship: false, roc: true, fps: true },
  },
];

function renderSection(searchParams = "") {
  return renderWithIntl(
    <NuqsTestingAdapter searchParams={searchParams}>
      <OreListSection ores={ores} />
    </NuqsTestingAdapter>,
    { locale: "en" },
  );
}

describe("OreListSection", () => {
  it("shows all ores and the filters without URL state", () => {
    renderSection();
    expect(screen.getByText("Quantainium")).toBeVisible();
    expect(screen.getByText("Hadanite")).toBeVisible();
    expect(
      screen.getByRole("group", { name: "Filter by rarity" }),
    ).toBeVisible();
  });

  it("filters client-side by method from the URL", () => {
    renderSection("?method=fps");
    expect(screen.getByText("Hadanite")).toBeVisible();
    expect(screen.queryByText("Quantainium")).not.toBeInTheDocument();
  });

  it("filters client-side by rarity from the URL", () => {
    renderSection("?rarity=legendary");
    expect(screen.getByText("Quantainium")).toBeVisible();
    expect(screen.queryByText("Hadanite")).not.toBeInTheDocument();
  });
});
