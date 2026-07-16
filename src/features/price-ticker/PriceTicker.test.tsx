import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PriceTicker } from "./PriceTicker";
import type { TickerEntry } from "./ticker.service";

const MESSAGES = {
  priceTicker: {
    label: "Live commodity prices",
    unit: "aUEC/SCU",
    up: "up vs. previous day",
    down: "down vs. previous day",
    same: "unchanged vs. previous day",
    sellAt: "Sell at best price:",
    moreTerminals: "+{count} more",
  },
};

function Wrapper({ children }: { children: ReactNode }) {
  return (
    <NextIntlClientProvider locale="en" timeZone="UTC" messages={MESSAGES}>
      {children}
    </NextIntlClientProvider>
  );
}

const ENTRIES: TickerEntry[] = [
  {
    oreCode: "QUAN",
    nameDe: "Quantanium",
    nameEn: "Quantainium",
    bestSell: 91.5,
    prevClose: 85,
    direction: "up",
    changePercent: 7.6,
    sellTerminals: ["TDD Area 18"],
    sellTerminalCount: 1,
  },
  {
    oreCode: "LARA",
    nameDe: "Laranite",
    nameEn: "Laranite",
    bestSell: 50,
    prevClose: 60,
    direction: "down",
    changePercent: -16.7,
    sellTerminals: ["ARC-L1 Wide Forest Station", "Checkmate Station"],
    sellTerminalCount: 2,
  },
  {
    oreCode: "GOLD",
    nameDe: "Gold",
    nameEn: "Gold",
    bestSell: 6.1,
    prevClose: 6.1,
    direction: "same",
    changePercent: 0,
    sellTerminals: ["Alpha", "Beta", "Gamma", "Delta", "Epsilon"],
    sellTerminalCount: 7,
  },
  {
    oreCode: "IRON",
    nameDe: "Eisen",
    nameEn: "Iron",
    bestSell: 300,
    prevClose: null,
    direction: null,
    changePercent: null,
    sellTerminals: ["Orison Refinery"],
    sellTerminalCount: 1,
  },
];

function mockFetch(entries: TickerEntry[]): void {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(entries),
    }),
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("PriceTicker", () => {
  it("reserves the bar height while loading to avoid a layout shift", () => {
    // fetch bleibt offen — wir prüfen den Ladezustand
    vi.stubGlobal("fetch", vi.fn().mockReturnValue(new Promise(() => {})));
    const { container } = render(<PriceTicker />, { wrapper: Wrapper });

    const placeholder = container.querySelector(".ticker-viewport");
    expect(placeholder).toBeInTheDocument();
    expect(placeholder).toHaveAttribute("aria-hidden", "true");
    expect(screen.queryByRole("region")).not.toBeInTheDocument();
  });

  it("collapses once the response confirms there are no entries", async () => {
    mockFetch([]);
    const { container } = render(<PriceTicker />, { wrapper: Wrapper });

    await waitFor(() => expect(container).toBeEmptyDOMElement());
    expect(screen.queryByRole("region")).not.toBeInTheDocument();
  });

  it("renders a labelled region with locale name, price and unit", async () => {
    mockFetch(ENTRIES);
    render(<PriceTicker />, { wrapper: Wrapper });

    const region = await screen.findByRole("region", {
      name: "Live commodity prices",
    });
    expect(region).toBeInTheDocument();
    // Englischer Name, en-formatierter Preis, Einheit
    expect(screen.getAllByText("Quantainium").length).toBeGreaterThan(0);
    expect(screen.getAllByText(/91\.5/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/aUEC\/SCU/).length).toBeGreaterThan(0);
  });

  it("duplicates the track for the seamless loop and hides the copy from a11y", async () => {
    mockFetch(ENTRIES);
    render(<PriceTicker />, { wrapper: Wrapper });
    await screen.findByRole("region", { name: "Live commodity prices" });

    const copies = screen.getAllByText("Quantainium");
    expect(copies).toHaveLength(2);
    const hidden = copies.filter((el) => el.closest('[aria-hidden="true"]'));
    expect(hidden).toHaveLength(1);
  });

  it("announces the direction per entry via screen-reader text", async () => {
    mockFetch(ENTRIES);
    render(<PriceTicker />, { wrapper: Wrapper });
    await screen.findByRole("region", { name: "Live commodity prices" });

    expect(screen.getAllByText("up vs. previous day")).toHaveLength(2);
    expect(screen.getAllByText("down vs. previous day")).toHaveLength(2);
    expect(screen.getAllByText("unchanged vs. previous day")).toHaveLength(2);
  });

  it("shows the signed change percent for moved prices only", async () => {
    mockFetch(ENTRIES);
    render(<PriceTicker />, { wrapper: Wrapper });
    await screen.findByRole("region", { name: "Live commodity prices" });

    expect(screen.getAllByText("+7.6%")).toHaveLength(2);
    expect(screen.getAllByText("-16.7%")).toHaveLength(2);
    // same/null bekommen keinen Prozentwert
    expect(screen.queryByText("+0%")).not.toBeInTheDocument();
    expect(screen.queryByText("0%")).not.toBeInTheDocument();
  });

  it("links every entry to its ore detail page", async () => {
    mockFetch(ENTRIES);
    render(<PriceTicker />, { wrapper: Wrapper });
    await screen.findByRole("region", { name: "Live commodity prices" });

    const quanLink = screen.getByRole("link", { name: /Quantainium/ });
    expect(quanLink).toHaveAttribute("href", "/ores/quan");
    expect(screen.getByRole("link", { name: /Iron/ })).toHaveAttribute(
      "href",
      "/ores/iron",
    );
  });

  it("keeps the duplicated copy out of the tab order", async () => {
    mockFetch(ENTRIES);
    const { container } = render(<PriceTicker />, { wrapper: Wrapper });
    await screen.findByRole("region", { name: "Live commodity prices" });

    const dupLinks = container.querySelectorAll(".ticker-dup a");
    expect(dupLinks.length).toBe(ENTRIES.length);
    for (const link of dupLinks) {
      expect(link).toHaveAttribute("tabindex", "-1");
    }
  });

  it("describes the best-price sell terminals for screen readers", async () => {
    mockFetch(ENTRIES);
    render(<PriceTicker />, { wrapper: Wrapper });
    await screen.findByRole("region", { name: "Live commodity prices" });

    expect(
      screen.getByRole("link", { name: /Quantainium/ }),
    ).toHaveAccessibleDescription(/Sell at best price:.*TDD Area 18/);
    expect(
      screen.getByRole("link", { name: /Gold/ }),
    ).toHaveAccessibleDescription(/\+2 more/);
  });

  it("shows a sell-location tooltip on hover and hides it on leave", async () => {
    mockFetch(ENTRIES);
    render(<PriceTicker />, { wrapper: Wrapper });
    await screen.findByRole("region", { name: "Live commodity prices" });

    expect(screen.queryByTestId("ticker-tooltip")).not.toBeInTheDocument();

    const laraLink = screen.getByRole("link", { name: /Laranite/ });
    fireEvent.mouseEnter(laraLink);

    const tooltip = screen.getByTestId("ticker-tooltip");
    expect(tooltip).toHaveTextContent("Sell at best price:");
    expect(tooltip).toHaveTextContent("ARC-L1 Wide Forest Station");
    expect(tooltip).toHaveTextContent("Checkmate Station");

    fireEvent.mouseLeave(laraLink);
    expect(screen.queryByTestId("ticker-tooltip")).not.toBeInTheDocument();

    // Gekappte Liste zeigt den Rest als "+N more"
    const goldLink = screen.getByRole("link", { name: /Gold/ });
    fireEvent.mouseEnter(goldLink);
    expect(screen.getByTestId("ticker-tooltip")).toHaveTextContent("+2 more");
  });
});
