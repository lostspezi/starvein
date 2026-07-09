import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NuqsTestingAdapter, type UrlUpdateEvent } from "nuqs/adapters/testing";
import { describe, expect, it, vi } from "vitest";
import { renderWithIntl } from "@/test/render";
import { OreFilters } from "./OreFilters";

function renderFilters(searchParams = "") {
  const onUrlUpdate = vi.fn<(event: UrlUpdateEvent) => void>();
  renderWithIntl(
    <NuqsTestingAdapter searchParams={searchParams} onUrlUpdate={onUrlUpdate}>
      <OreFilters />
    </NuqsTestingAdapter>,
    { locale: "en" },
  );
  return { onUrlUpdate };
}

describe("OreFilters", () => {
  it("renders rarity and method filter groups", () => {
    renderFilters();
    expect(
      screen.getByRole("group", { name: "Filter by rarity" }),
    ).toBeVisible();
    expect(
      screen.getByRole("group", { name: "Filter by mining method" }),
    ).toBeVisible();
  });

  it("sets the rarity query param on click", async () => {
    const user = userEvent.setup();
    const { onUrlUpdate } = renderFilters();

    await user.click(screen.getByRole("button", { name: "Rare" }));

    const event = onUrlUpdate.mock.calls.at(-1)?.[0];
    expect(event?.searchParams.get("rarity")).toBe("rare");
  });

  it("sets the method query param on click", async () => {
    const user = userEvent.setup();
    const { onUrlUpdate } = renderFilters();

    await user.click(screen.getByRole("button", { name: "ROC" }));

    const event = onUrlUpdate.mock.calls.at(-1)?.[0];
    expect(event?.searchParams.get("method")).toBe("roc");
  });

  it("clears the rarity param via the All button", async () => {
    const user = userEvent.setup();
    const { onUrlUpdate } = renderFilters("?rarity=rare");

    const rarityGroup = screen.getByRole("group", { name: "Filter by rarity" });
    await user.click(within(rarityGroup).getByRole("button", { name: "All" }));

    const event = onUrlUpdate.mock.calls.at(-1)?.[0];
    expect(event?.searchParams.get("rarity")).toBeNull();
  });
});
