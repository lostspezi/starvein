import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NuqsTestingAdapter } from "nuqs/adapters/testing";
import { describe, expect, it } from "vitest";
import type { Ore } from "@/features/ores/ores.schema";
import { renderWithIntl } from "@/test/render";
import { SignatureChart } from "./SignatureChart";
import type { SignatureProfile } from "./signature-profiles.schema";
import { buildChartRows, chartAxisMax } from "./signature-chart.model";

function ore(code: string, name: string, rarityTier: Ore["rarityTier"]): Ore {
  return {
    code,
    name_de: name,
    name_en: name,
    rarityTier,
    mineableBy: { ship: true, roc: false, fps: false },
  };
}

const ORES: Ore[] = [
  ore("QUAN", "Quantainium", "legendary"),
  ore("BEXA", "Bexalite", "uncommon"),
  ore("ICE", "Ice", "common"),
];

const PROFILES: SignatureProfile[] = [
  {
    oreCode: "ICE",
    method: "ship",
    signatureValue: 4300,
    patchVersion: "4.7",
    sourceType: "curated",
    confidenceScore: 0.6,
  },
  {
    oreCode: "QUAN",
    method: "ship",
    signatureValue: 3170,
    dominantCompositionRange: { min: 40, max: 80 },
    notes: "+ Beryl (10-20%)",
    patchVersion: "4.7",
    sourceType: "curated",
    confidenceScore: 0.6,
  },
  {
    oreCode: "BEXA",
    method: "ship",
    signatureValue: 3600,
    patchVersion: "4.7",
    sourceType: "curated",
    confidenceScore: 0.6,
  },
];

function renderChart(searchParams = "") {
  const rows = buildChartRows(PROFILES, ORES);
  renderWithIntl(
    <NuqsTestingAdapter searchParams={searchParams}>
      <SignatureChart rows={rows} axisMax={chartAxisMax(rows)} />
    </NuqsTestingAdapter>,
    { locale: "en" },
  );
}

function rowButton(name: RegExp) {
  return screen.getByRole("button", { name });
}

describe("SignatureChart", () => {
  it("renders ship rows sorted by base signature plus the generic ground tracks", () => {
    renderChart();

    const buttons = screen
      .getAllByRole("button")
      .map((b) => b.getAttribute("aria-label") ?? "");
    const quan = buttons.findIndex((l) => l.includes("Quantainium"));
    const bexa = buttons.findIndex((l) => l.includes("Bexalite"));
    const ice = buttons.findIndex((l) => l.includes("Ice"));

    expect(quan).toBeGreaterThanOrEqual(0);
    expect(quan).toBeLessThan(bexa);
    expect(bexa).toBeLessThan(ice);

    expect(screen.getByText("ROC Mineables")).toBeVisible();
    expect(screen.getByText("FPS Mineables")).toBeVisible();
  });

  it("highlights the matching row and shows the cluster step for a scanned value", async () => {
    const user = userEvent.setup();
    renderChart();

    await user.type(screen.getByLabelText(/scan value/i), "18000");

    // Bexalite ×5 = 18000 → its row is flagged as a match.
    expect(rowButton(/Bexalite/)).toHaveAttribute("data-matched", "true");
    // The identified cluster size is surfaced (×5).
    expect(screen.getAllByText("×5").length).toBeGreaterThan(0);
    // A non-matching row stays unmatched.
    expect(rowButton(/Quantainium/)).toHaveAttribute("data-matched", "false");
  });

  it("reports no match for a value no cluster produces", async () => {
    const user = userEvent.setup();
    renderChart();

    await user.type(screen.getByLabelText(/scan value/i), "999");

    expect(screen.getByText(/no cluster/i)).toBeVisible();
    expect(rowButton(/Bexalite/)).toHaveAttribute("data-matched", "false");
  });

  it("expands a ship row to its composition and cluster detail on click", async () => {
    const user = userEvent.setup();
    renderChart();

    await user.click(rowButton(/Quantainium/));

    expect(
      screen.getByText("Signature cluster (identifies mineral)"),
    ).toBeVisible();
    expect(screen.getByText(/40–80%/)).toBeVisible();
  });
});
