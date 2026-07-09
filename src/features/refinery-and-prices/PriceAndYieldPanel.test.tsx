import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { renderWithIntl } from "@/test/render";
import { PriceAndYieldPanel } from "./PriceAndYieldPanel";
import type { OrePriceSummary } from "./price-summary";
import type { RefineryYield } from "./refinery-and-prices.schema";

const summary: OrePriceSummary = {
  raw: {
    bestSell: {
      oreCode: "GOLD",
      kind: "raw",
      terminalId: 99,
      terminalName: "Refinery Deck Everus Harbor",
      priceBuy: 0,
      priceSell: 14000,
      syncedAt: "2026-07-09T10:00:00.000Z",
    },
    topSellTerminals: [
      {
        oreCode: "GOLD",
        kind: "raw",
        terminalId: 99,
        terminalName: "Refinery Deck Everus Harbor",
        priceBuy: 0,
        priceSell: 14000,
        syncedAt: "2026-07-09T10:00:00.000Z",
      },
    ],
  },
  refined: {
    bestSell: {
      oreCode: "GOLD",
      kind: "refined",
      terminalId: 12,
      terminalName: "TDD Area 18",
      priceBuy: 0,
      priceSell: 28000,
      syncedAt: "2026-07-09T10:00:00.000Z",
    },
    topSellTerminals: [],
  },
  syncedAt: "2026-07-09T10:00:00.000Z",
};

const yields: RefineryYield[] = [
  {
    oreCode: "GOLD",
    terminalId: 755,
    terminalName: "Refinement Center - Nyx Gateway (Pyro)",
    starSystemName: "Pyro",
    bonusPercent: -5,
    syncedAt: "2026-07-09T10:00:00.000Z",
  },
];

describe("PriceAndYieldPanel", () => {
  it("shows best sell prices for raw and refined", () => {
    renderWithIntl(<PriceAndYieldPanel summary={summary} yields={yields} />, {
      locale: "en",
    });

    expect(screen.getByText(/14[,.]000/)).toBeVisible();
    expect(screen.getByText(/28[,.]000/)).toBeVisible();
    expect(screen.getByText("TDD Area 18")).toBeVisible();
  });

  it("shows refinery yield bonuses with terminal", () => {
    renderWithIntl(<PriceAndYieldPanel summary={summary} yields={yields} />, {
      locale: "en",
    });

    expect(screen.getByText("−5%")).toBeVisible();
    expect(
      screen.getByText("Refinement Center - Nyx Gateway (Pyro)"),
    ).toBeVisible();
  });

  it("shows the last-synced timestamp", () => {
    renderWithIntl(<PriceAndYieldPanel summary={summary} yields={yields} />, {
      locale: "de",
    });
    expect(
      screen.getByText(/Zuletzt synchronisiert/, { exact: false }),
    ).toBeVisible();
  });

  it("shows an unsynced state without data", () => {
    renderWithIntl(
      <PriceAndYieldPanel
        summary={{ raw: null, refined: null, syncedAt: null }}
        yields={[]}
      />,
      { locale: "en" },
    );

    expect(
      screen.getByText("Not synced with UEX yet.", { exact: false }),
    ).toBeVisible();
  });
});
