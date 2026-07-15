import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderWithIntl } from "@/test/render";
import { WarehouseMoveForm } from "./WarehouseMoveForm";

const SYSTEMS = [{ code: "STANTON", name: "Stanton" }];
const BODIES = [{ systemCode: "STANTON", slug: "daymar", name: "Daymar" }];
const TERMINALS = [
  { terminalId: 32, terminalName: "ARC-L1 Wide Forest Station" },
];

beforeEach(() => {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => ({ ok: true, json: async () => ({ id: "new" }) })),
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
});

function renderForm(quantityScu = 100) {
  return renderWithIntl(
    <WarehouseMoveForm
      entryId="entry-1"
      quantityScu={quantityScu}
      systems={SYSTEMS}
      bodies={BODIES}
      terminals={TERMINALS}
      onDone={() => {}}
    />,
    { locale: "en" },
  );
}

describe("WarehouseMoveForm", () => {
  it("defaults the move quantity to the full stock", () => {
    renderForm(100);
    expect(screen.getByLabelText("Move quantity (SCU)")).toHaveValue(100);
  });

  it("moves a partial quantity to a custom location", async () => {
    const user = userEvent.setup();
    renderForm(100);

    await user.click(screen.getByRole("radio", { name: "Custom place" }));
    await user.type(screen.getByLabelText("Place"), "in my ship");
    const quantity = screen.getByLabelText("Move quantity (SCU)");
    await user.clear(quantity);
    await user.type(quantity, "40");
    await user.click(screen.getByRole("button", { name: "Move" }));

    expect(fetch).toHaveBeenCalledWith(
      "/api/warehouse/entry-1/move",
      expect.objectContaining({ method: "POST" }),
    );
    const body = JSON.parse(
      (vi.mocked(fetch).mock.calls[0][1] as RequestInit).body as string,
    );
    expect(body).toEqual({
      location: { kind: "custom", label: "in my ship" },
      quantityScu: 40,
    });
  });

  it("moves the whole stack to a celestial body", async () => {
    const user = userEvent.setup();
    renderForm(100);

    await user.type(screen.getByRole("combobox", { name: "Location" }), "day");
    await user.click(screen.getByRole("option", { name: /Daymar/ }));
    await user.click(screen.getByRole("button", { name: "Move" }));

    const body = JSON.parse(
      (vi.mocked(fetch).mock.calls[0][1] as RequestInit).body as string,
    );
    expect(body).toEqual({
      location: {
        kind: "celestialBody",
        systemCode: "STANTON",
        bodySlug: "daymar",
      },
      quantityScu: 100,
    });
  });

  it("keeps submit disabled until a location is picked", async () => {
    const user = userEvent.setup();
    renderForm(100);

    expect(screen.getByRole("button", { name: "Move" })).toBeDisabled();

    await user.type(screen.getByRole("combobox", { name: "Location" }), "day");
    await user.click(screen.getByRole("option", { name: /Daymar/ }));

    expect(screen.getByRole("button", { name: "Move" })).toBeEnabled();
  });

  it("disables submit when the quantity exceeds the stock", async () => {
    const user = userEvent.setup();
    renderForm(100);

    await user.type(screen.getByRole("combobox", { name: "Location" }), "day");
    await user.click(screen.getByRole("option", { name: /Daymar/ }));
    const quantity = screen.getByLabelText("Move quantity (SCU)");
    await user.clear(quantity);
    await user.type(quantity, "150");

    expect(screen.getByRole("button", { name: "Move" })).toBeDisabled();
  });
});
