import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NuqsTestingAdapter, type UrlUpdateEvent } from "nuqs/adapters/testing";
import { describe, expect, it, vi } from "vitest";
import type { Ore } from "@/features/ores/ores.schema";
import { renderWithIntl } from "@/test/render";
import { ExplorerFilters } from "./ExplorerFilters";

const ores: Ore[] = [
  {
    code: "GOLD",
    name_de: "Gold",
    name_en: "Gold",
    rarityTier: "rare",
    mineableBy: { ship: true, roc: false, fps: false },
  },
];

function renderFilters(searchParams = "") {
  const onUrlUpdate = vi.fn<(event: UrlUpdateEvent) => void>();
  renderWithIntl(
    <NuqsTestingAdapter searchParams={searchParams} onUrlUpdate={onUrlUpdate}>
      <ExplorerFilters ores={ores} />
    </NuqsTestingAdapter>,
    { locale: "en" },
  );
  return { onUrlUpdate };
}

describe("ExplorerFilters", () => {
  it("renders method, system, rarity groups and an ore select", () => {
    renderFilters();

    expect(
      screen.getByRole("group", { name: "Filter by mining method" }),
    ).toBeVisible();
    expect(
      screen.getByRole("group", { name: "Filter by star system" }),
    ).toBeVisible();
    expect(
      screen.getByRole("group", { name: "Filter by rarity" }),
    ).toBeVisible();
    expect(screen.getByLabelText("Ore")).toBeVisible();
  });

  it("sets the system query param", async () => {
    const user = userEvent.setup();
    const { onUrlUpdate } = renderFilters();

    const systemGroup = screen.getByRole("group", {
      name: "Filter by star system",
    });
    await user.click(within(systemGroup).getByRole("button", { name: "PYRO" }));

    const event = onUrlUpdate.mock.calls.at(-1)?.[0];
    expect(event?.searchParams.get("system")).toBe("PYRO");
  });

  it("sets the ore query param via the select", async () => {
    const user = userEvent.setup();
    const { onUrlUpdate } = renderFilters();

    await user.selectOptions(screen.getByLabelText("Ore"), "GOLD");

    const event = onUrlUpdate.mock.calls.at(-1)?.[0];
    expect(event?.searchParams.get("ore")).toBe("GOLD");
  });
});
