import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NuqsTestingAdapter, type UrlUpdateEvent } from "nuqs/adapters/testing";
import { describe, expect, it, vi } from "vitest";
import type { Ore } from "@/features/ores/ores.schema";
import { renderWithIntl } from "@/test/render";
import { CompareSelect } from "./CompareSelect";

const ores: Ore[] = [
  {
    code: "QUAN",
    name_de: "Quantainium",
    name_en: "Quantainium",
    rarityTier: "legendary",
    mineableBy: { ship: true, roc: false, fps: false },
  },
  {
    code: "GOLD",
    name_de: "Gold",
    name_en: "Gold",
    rarityTier: "rare",
    mineableBy: { ship: true, roc: false, fps: false },
  },
];

function renderSelect(searchParams = "") {
  const onUrlUpdate = vi.fn<(event: UrlUpdateEvent) => void>();
  renderWithIntl(
    <NuqsTestingAdapter searchParams={searchParams} onUrlUpdate={onUrlUpdate}>
      <CompareSelect ores={ores} />
    </NuqsTestingAdapter>,
    { locale: "en" },
  );
  return { onUrlUpdate };
}

describe("CompareSelect", () => {
  it("renders three ore slots", () => {
    renderSelect();
    expect(screen.getByLabelText("Ore 1")).toBeVisible();
    expect(screen.getByLabelText("Ore 2")).toBeVisible();
    expect(screen.getByLabelText("Ore 3")).toBeVisible();
  });

  it("adds the selected ore to the ores url param", async () => {
    const user = userEvent.setup();
    const { onUrlUpdate } = renderSelect();

    await user.selectOptions(screen.getByLabelText("Ore 1"), "QUAN");

    const event = onUrlUpdate.mock.calls.at(-1)?.[0];
    expect(event?.searchParams.get("ores")).toBe("QUAN");
  });

  it("appends a second ore", async () => {
    const user = userEvent.setup();
    const { onUrlUpdate } = renderSelect("?ores=QUAN");

    await user.selectOptions(screen.getByLabelText("Ore 2"), "GOLD");

    const event = onUrlUpdate.mock.calls.at(-1)?.[0];
    expect(event?.searchParams.get("ores")).toBe("QUAN,GOLD");
  });
});
