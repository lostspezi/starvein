import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderWithIntl } from "@/test/render";
import { WarehouseEntryForm } from "./WarehouseEntryForm";

const ORES = [
  { code: "QUAN", name: "Quantainium" },
  { code: "GOLD", name: "Gold" },
];
const SYSTEMS = [{ code: "STANTON", name: "Stanton" }];
const BODIES = [
  { systemCode: "STANTON", slug: "daymar", name: "Daymar" },
  { systemCode: "STANTON", slug: "arc-l1", name: "ARC-L1" },
];
const TERMINALS = [
  { terminalId: 32, terminalName: "ARC-L1 Wide Forest Station" },
];

beforeEach(() => {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => ({ ok: true, json: async () => ({ id: "e1" }) })),
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
});

function renderForm(terminals = TERMINALS) {
  return renderWithIntl(
    <WarehouseEntryForm
      ores={ORES}
      systems={SYSTEMS}
      bodies={BODIES}
      terminals={terminals}
    />,
    { locale: "en" },
  );
}

describe("WarehouseEntryForm", () => {
  it("creates an entry at a celestial body via autocomplete", async () => {
    const user = userEvent.setup();
    renderForm();

    await user.type(screen.getByRole("combobox", { name: "Ore" }), "quan");
    await user.click(screen.getByRole("option", { name: /Quantainium/ }));
    await user.clear(screen.getByLabelText("Quantity (SCU)"));
    await user.type(screen.getByLabelText("Quantity (SCU)"), "32");
    await user.type(screen.getByRole("combobox", { name: "Location" }), "day");
    await user.click(screen.getByRole("option", { name: /Daymar/ }));
    await user.click(screen.getByRole("button", { name: "Add entry" }));

    expect(fetch).toHaveBeenCalledWith(
      "/api/warehouse",
      expect.objectContaining({ method: "POST" }),
    );
    const body = JSON.parse(
      (vi.mocked(fetch).mock.calls[0][1] as RequestInit).body as string,
    );
    expect(body).toEqual({
      oreCode: "QUAN",
      kind: "raw",
      quantityScu: 32,
      location: {
        kind: "celestialBody",
        systemCode: "STANTON",
        bodySlug: "daymar",
      },
    });
  });

  it("shows the body's system as autocomplete detail", async () => {
    const user = userEvent.setup();
    renderForm();

    await user.click(screen.getByRole("combobox", { name: "Location" }));

    expect(
      screen.getByRole("option", { name: /Daymar\s*Stanton/ }),
    ).toBeVisible();
  });

  it("creates a refined entry at a custom location with a note", async () => {
    const user = userEvent.setup();
    renderForm();

    await user.type(screen.getByRole("combobox", { name: "Ore" }), "gold");
    await user.click(screen.getByRole("option", { name: /Gold/ }));
    await user.click(screen.getByRole("radio", { name: "Refined" }));
    await user.clear(screen.getByLabelText("Quantity (SCU)"));
    await user.type(screen.getByLabelText("Quantity (SCU)"), "4.5");
    await user.click(screen.getByRole("radio", { name: "Custom place" }));
    await user.type(screen.getByLabelText("Place"), "in my ship");
    await user.type(screen.getByLabelText("Note"), "aft cargo grid");
    await user.click(screen.getByRole("button", { name: "Add entry" }));

    const body = JSON.parse(
      (vi.mocked(fetch).mock.calls[0][1] as RequestInit).body as string,
    );
    expect(body).toEqual({
      oreCode: "GOLD",
      kind: "refined",
      quantityScu: 4.5,
      location: { kind: "custom", label: "in my ship" },
      note: "aft cargo grid",
    });
  });

  it("selects a refinery terminal via autocomplete", async () => {
    const user = userEvent.setup();
    renderForm();

    await user.type(screen.getByRole("combobox", { name: "Ore" }), "quan");
    await user.click(screen.getByRole("option", { name: /Quantainium/ }));
    await user.click(screen.getByRole("radio", { name: "Refinery terminal" }));
    await user.type(screen.getByRole("combobox", { name: "Terminal" }), "wide");
    await user.click(screen.getByRole("option", { name: /Wide Forest/ }));
    await user.click(screen.getByRole("button", { name: "Add entry" }));

    const body = JSON.parse(
      (vi.mocked(fetch).mock.calls[0][1] as RequestInit).body as string,
    );
    expect(body.location).toEqual({ kind: "terminal", terminalId: 32 });
  });

  it("keeps the submit disabled until ore and location are picked", async () => {
    const user = userEvent.setup();
    renderForm();

    expect(screen.getByRole("button", { name: "Add entry" })).toBeDisabled();

    await user.type(screen.getByRole("combobox", { name: "Ore" }), "quan");
    await user.click(screen.getByRole("option", { name: /Quantainium/ }));

    expect(screen.getByRole("button", { name: "Add entry" })).toBeDisabled();

    await user.type(screen.getByRole("combobox", { name: "Location" }), "day");
    await user.click(screen.getByRole("option", { name: /Daymar/ }));

    expect(screen.getByRole("button", { name: "Add entry" })).toBeEnabled();
  });

  it("hides the terminal option when no terminals are synced", () => {
    renderForm([]);

    expect(
      screen.queryByRole("radio", { name: "Refinery terminal" }),
    ).not.toBeInTheDocument();
  });
});
