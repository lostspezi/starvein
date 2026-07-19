import { fireEvent, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { renderWithIntl } from "@/test/render";
import { OreList, type OreListDisplayRow } from "./OreList";
import type { Ore } from "./ores.schema";

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
    name_de: "Hadanite",
    name_en: "Hadanite",
    rarityTier: "epic",
    mineableBy: { ship: false, roc: true, fps: true },
  },
];

describe("OreList", () => {
  it("renders a row per ore with code and name", () => {
    renderWithIntl(<OreList ores={ores} />, { locale: "en" });
    expect(screen.getByText("Quantainium")).toBeVisible();
    expect(screen.getByText("QUAN")).toBeVisible();
    expect(screen.getByText("Hadanite")).toBeVisible();
  });

  it("anchors each row by ore code and links to the ore detail page", () => {
    renderWithIntl(<OreList ores={ores} />, { locale: "en" });
    const row = screen.getByText("Quantainium").closest("tr");
    expect(row).toHaveAttribute("id", "QUAN");
    // Scroll-Offsets decken den Sticky-Header ab: ~120px (2 Zeilen, sm–xl),
    // ~60px einzeilig ab xl, ~135px mobil (siehe MASTER.md §7).
    expect(row).toHaveClass(
      "scroll-mt-40",
      "sm:scroll-mt-32",
      "xl:scroll-mt-24",
    );
    expect(screen.getByRole("link", { name: "Quantainium" })).toHaveAttribute(
      "href",
      "/ores/quan",
    );
  });

  it("shows the localized rarity label", () => {
    renderWithIntl(<OreList ores={ores} />, { locale: "de" });
    expect(screen.getByText("Legendär")).toBeVisible();
    expect(screen.getByText("Episch")).toBeVisible();
  });

  it("shows the mining methods per ore", () => {
    renderWithIntl(<OreList ores={ores} />, { locale: "en" });
    const hadaRow = screen.getByText("Hadanite").closest("tr");
    expect(hadaRow).toHaveTextContent("ROC");
    expect(hadaRow).toHaveTextContent("FPS");
    expect(hadaRow).not.toHaveTextContent("Ship");
  });

  it("reveals per-method signatures and the ore's prices on expand", () => {
    const enriched: OreListDisplayRow[] = [
      {
        code: "GOLD",
        name_de: "Gold",
        name_en: "Gold",
        rarityTier: "rare",
        mineableBy: { ship: true, roc: true, fps: false },
        bestRawSell: 19000,
        bestRefinedSell: 28000,
        signatures: [
          {
            oreCode: "GOLD",
            method: "ship",
            signatureValue: 3585,
            dominantCompositionRange: { min: 40, max: 80 },
            patchVersion: "4.7",
            sourceType: "curated",
            confidenceScore: 0.6,
          },
          {
            oreCode: "GOLD",
            method: "roc",
            signatureValue: 4000,
            patchVersion: "4.7",
            sourceType: "curated",
            confidenceScore: 0.6,
          },
        ],
      },
    ];

    renderWithIntl(<OreList ores={enriched} />, { locale: "en" });

    fireEvent.click(
      screen.getByRole("button", {
        name: "Show signature cluster and prices",
      }),
    );

    // Both methods get their own cluster panel (ship identifies mineral, ROC = size)
    expect(
      screen.getByText("Signature cluster (identifies mineral)"),
    ).toBeVisible();
    expect(
      screen.getByText("Deposit size (not mineral-specific)"),
    ).toBeVisible();
    // 2× of 3585 (ship) and 2× of 4000 (roc)
    expect(screen.getByText("7,170")).toBeVisible();
    expect(screen.getByText("8,000")).toBeVisible();
    // Raw price appears in the expanded detail; refined shows in summary + detail
    expect(screen.getByText("19,000")).toBeVisible();
    expect(screen.getAllByText(/28[,.]000/).length).toBeGreaterThanOrEqual(1);
  });

  it("shows an empty state when no ores match", () => {
    renderWithIntl(<OreList ores={[]} />, { locale: "en" });
    expect(
      screen.getByText("No ores found — adjust filters or run the seed."),
    ).toBeVisible();
  });
});
