import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderWithIntl } from "@/test/render";
import { RefineryJobForm } from "./RefineryJobForm";

const TERMINALS = [
  {
    terminalId: 32,
    terminalName: "ARC-L1 Wide Forest Station",
    starSystemName: "Stanton",
  },
  {
    terminalId: 90,
    terminalName: "Checkmate Station",
    starSystemName: "Pyro",
  },
];
const METHODS = [
  {
    code: "DINYX",
    name: "Dinyx Solventation",
    ratingYield: 3,
    ratingCost: 1,
    ratingSpeed: 1,
  },
];
const ORES = [
  { code: "QUAN", name: "Quantainium" },
  { code: "GOLD", name: "Gold" },
];

beforeEach(() => {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => ({ ok: true, json: async () => ({ id: "job-1" }) })),
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
});

function renderForm() {
  return renderWithIntl(
    <RefineryJobForm terminals={TERMINALS} methods={METHODS} ores={ORES} />,
    { locale: "en" },
  );
}

describe("RefineryJobForm", () => {
  it("tracks a job with one ore and a duration in hours and minutes", async () => {
    const user = userEvent.setup();
    renderForm();

    await user.selectOptions(screen.getByLabelText("Refinery terminal"), "32");
    await user.selectOptions(screen.getByLabelText("Refining method"), "DINYX");
    await user.selectOptions(screen.getByLabelText("Ore 1"), "QUAN");
    await user.clear(screen.getByLabelText("Quantity (SCU) 1"));
    await user.type(screen.getByLabelText("Quantity (SCU) 1"), "32");
    await user.clear(screen.getByLabelText("Hours"));
    await user.type(screen.getByLabelText("Hours"), "1");
    await user.clear(screen.getByLabelText("Minutes"));
    await user.type(screen.getByLabelText("Minutes"), "30");
    await user.click(screen.getByRole("button", { name: "Track job" }));

    expect(fetch).toHaveBeenCalledWith(
      "/api/refinery-jobs",
      expect.objectContaining({ method: "POST" }),
    );
    const body = JSON.parse(
      (vi.mocked(fetch).mock.calls[0][1] as RequestInit).body as string,
    );
    expect(body).toEqual({
      terminalId: 32,
      methodCode: "DINYX",
      items: [{ oreCode: "QUAN", quantityScu: 32 }],
      durationMinutes: 90,
    });
  });

  it("supports multiple ore rows", async () => {
    const user = userEvent.setup();
    renderForm();

    await user.selectOptions(screen.getByLabelText("Refinery terminal"), "32");
    await user.selectOptions(screen.getByLabelText("Refining method"), "DINYX");
    await user.clear(screen.getByLabelText("Quantity (SCU) 1"));
    await user.type(screen.getByLabelText("Quantity (SCU) 1"), "10");
    await user.click(screen.getByRole("button", { name: "Add ore" }));
    await user.selectOptions(screen.getByLabelText("Ore 2"), "GOLD");
    await user.clear(screen.getByLabelText("Quantity (SCU) 2"));
    await user.type(screen.getByLabelText("Quantity (SCU) 2"), "5");
    await user.clear(screen.getByLabelText("Minutes"));
    await user.type(screen.getByLabelText("Minutes"), "45");
    await user.click(screen.getByRole("button", { name: "Track job" }));

    const body = JSON.parse(
      (vi.mocked(fetch).mock.calls[0][1] as RequestInit).body as string,
    );
    expect(body.items).toEqual([
      { oreCode: "QUAN", quantityScu: 10 },
      { oreCode: "GOLD", quantityScu: 5 },
    ]);
    expect(body.durationMinutes).toBe(45);
  });

  it("removes an ore row", async () => {
    const user = userEvent.setup();
    renderForm();

    await user.click(screen.getByRole("button", { name: "Add ore" }));
    expect(screen.getByLabelText("Ore 2")).toBeVisible();

    await user.click(screen.getByRole("button", { name: "Remove ore 2" }));

    expect(screen.queryByLabelText("Ore 2")).not.toBeInTheDocument();
  });
});
