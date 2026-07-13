import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NuqsTestingAdapter, type UrlUpdateEvent } from "nuqs/adapters/testing";
import { describe, expect, it, vi } from "vitest";
import { renderWithIntl } from "@/test/render";
import { LoadoutFilters } from "./LoadoutFilters";

const vehicles = [
  { code: "mole", name: "MOLE" },
  { code: "prospector", name: "Prospector" },
];

function renderFilters(searchParams = "") {
  const onUrlUpdate = vi.fn<(event: UrlUpdateEvent) => void>();
  renderWithIntl(
    <NuqsTestingAdapter searchParams={searchParams} onUrlUpdate={onUrlUpdate}>
      <LoadoutFilters vehicles={vehicles} />
    </NuqsTestingAdapter>,
    { locale: "en" },
  );
  return { onUrlUpdate };
}

describe("LoadoutFilters", () => {
  it("renders search, method, vehicle and sort controls", () => {
    renderFilters();
    expect(
      screen.getByRole("searchbox", { name: "Find loadouts" }),
    ).toBeVisible();
    expect(
      screen.getByRole("group", { name: "Filter by mining method" }),
    ).toBeVisible();
    expect(
      screen.getByRole("combobox", { name: "Filter by vehicle" }),
    ).toBeVisible();
    expect(screen.getByRole("group", { name: "Sort loadouts" })).toBeVisible();
  });

  it("sets the q param when typing", async () => {
    const user = userEvent.setup();
    const { onUrlUpdate } = renderFilters();

    await user.type(
      screen.getByRole("searchbox", { name: "Find loadouts" }),
      "mole",
    );

    const event = onUrlUpdate.mock.calls.at(-1)?.[0];
    expect(event?.searchParams.get("q")).toBe("mole");
  });

  it("sets the method param on click", async () => {
    const user = userEvent.setup();
    const { onUrlUpdate } = renderFilters();

    await user.click(screen.getByRole("button", { name: "ROC" }));

    const event = onUrlUpdate.mock.calls.at(-1)?.[0];
    expect(event?.searchParams.get("method")).toBe("roc");
  });

  it("sets the vehicle param via the select", async () => {
    const user = userEvent.setup();
    const { onUrlUpdate } = renderFilters();

    await user.selectOptions(
      screen.getByRole("combobox", { name: "Filter by vehicle" }),
      "mole",
    );

    const event = onUrlUpdate.mock.calls.at(-1)?.[0];
    expect(event?.searchParams.get("vehicle")).toBe("mole");
  });

  it("sets the sort param on click", async () => {
    const user = userEvent.setup();
    const { onUrlUpdate } = renderFilters();

    await user.click(screen.getByRole("button", { name: "Newest" }));

    const event = onUrlUpdate.mock.calls.at(-1)?.[0];
    expect(event?.searchParams.get("sort")).toBe("new");
  });
});
