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
  it("creates an entry at a celestial body", async () => {
    const user = userEvent.setup();
    renderForm();

    await user.selectOptions(screen.getByLabelText("Ore"), "QUAN");
    await user.clear(screen.getByLabelText("Quantity (SCU)"));
    await user.type(screen.getByLabelText("Quantity (SCU)"), "32");
    await user.selectOptions(
      screen.getByLabelText("Location"),
      "STANTON:daymar",
    );
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

  it("creates a refined entry at a custom location with a note", async () => {
    const user = userEvent.setup();
    renderForm();

    await user.selectOptions(screen.getByLabelText("Ore"), "GOLD");
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

  it("hides the terminal option when no terminals are synced", () => {
    renderForm([]);

    expect(
      screen.queryByRole("radio", { name: "Refinery terminal" }),
    ).not.toBeInTheDocument();
  });
});
