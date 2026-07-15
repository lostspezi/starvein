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
  it("tracks a job via autocomplete with a duration in hours and minutes", async () => {
    const user = userEvent.setup();
    renderForm();

    await user.type(
      screen.getByRole("combobox", { name: "Refinery terminal" }),
      "wide",
    );
    await user.click(screen.getByRole("option", { name: /Wide Forest/ }));
    await user.selectOptions(screen.getByLabelText("Refining method"), "DINYX");
    await user.type(screen.getByRole("combobox", { name: "Ore 1" }), "quan");
    await user.click(screen.getByRole("option", { name: /Quantainium/ }));
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

  it("shows the terminal's star system as autocomplete detail", async () => {
    const user = userEvent.setup();
    renderForm();

    await user.click(
      screen.getByRole("combobox", { name: "Refinery terminal" }),
    );

    expect(
      screen.getByRole("option", { name: /Checkmate Station\s*Pyro/ }),
    ).toBeVisible();
  });

  it("supports multiple ore rows", async () => {
    const user = userEvent.setup();
    renderForm();

    await user.type(
      screen.getByRole("combobox", { name: "Refinery terminal" }),
      "wide",
    );
    await user.click(screen.getByRole("option", { name: /Wide Forest/ }));
    await user.type(screen.getByRole("combobox", { name: "Ore 1" }), "quan");
    await user.click(screen.getByRole("option", { name: /Quantainium/ }));
    await user.clear(screen.getByLabelText("Quantity (SCU) 1"));
    await user.type(screen.getByLabelText("Quantity (SCU) 1"), "10");
    await user.click(screen.getByRole("button", { name: "Add ore" }));
    await user.type(screen.getByRole("combobox", { name: "Ore 2" }), "gold");
    await user.click(screen.getByRole("option", { name: /Gold/ }));
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
    expect(screen.getByRole("combobox", { name: "Ore 2" })).toBeVisible();

    await user.click(screen.getByRole("button", { name: "Remove ore 2" }));

    expect(
      screen.queryByRole("combobox", { name: "Ore 2" }),
    ).not.toBeInTheDocument();
  });

  it("includes qualityRating on an item when a quality is entered", async () => {
    const user = userEvent.setup();
    renderForm();

    await user.type(
      screen.getByRole("combobox", { name: "Refinery terminal" }),
      "wide",
    );
    await user.click(screen.getByRole("option", { name: /Wide Forest/ }));
    await user.type(screen.getByRole("combobox", { name: "Ore 1" }), "quan");
    await user.click(screen.getByRole("option", { name: /Quantainium/ }));
    await user.type(screen.getByLabelText("Quality 1 (0–1000)"), "850");
    await user.clear(screen.getByLabelText("Minutes"));
    await user.type(screen.getByLabelText("Minutes"), "45");
    await user.click(screen.getByRole("button", { name: "Track job" }));

    const body = JSON.parse(
      (vi.mocked(fetch).mock.calls[0][1] as RequestInit).body as string,
    );
    expect(body.items).toEqual([
      { oreCode: "QUAN", quantityScu: 1, qualityRating: 850 },
    ]);
  });

  it("keeps the submit disabled until terminal and ores are picked", async () => {
    const user = userEvent.setup();
    renderForm();

    await user.clear(screen.getByLabelText("Minutes"));
    await user.type(screen.getByLabelText("Minutes"), "45");

    expect(screen.getByRole("button", { name: "Track job" })).toBeDisabled();

    await user.type(
      screen.getByRole("combobox", { name: "Refinery terminal" }),
      "wide",
    );
    await user.click(screen.getByRole("option", { name: /Wide Forest/ }));

    expect(screen.getByRole("button", { name: "Track job" })).toBeDisabled();

    await user.type(screen.getByRole("combobox", { name: "Ore 1" }), "quan");
    await user.click(screen.getByRole("option", { name: /Quantainium/ }));

    expect(screen.getByRole("button", { name: "Track job" })).toBeEnabled();
  });
});
