import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderWithIntl } from "@/test/render";
import { WarehouseEntryActions } from "./WarehouseEntryActions";

const SYSTEMS = [{ code: "STANTON", name: "Stanton" }];
const BODIES = [{ systemCode: "STANTON", slug: "daymar", name: "Daymar" }];
const TERMINALS = [
  { terminalId: 32, terminalName: "ARC-L1 Wide Forest Station" },
];

function renderActions(
  props: Partial<React.ComponentProps<typeof WarehouseEntryActions>> = {},
) {
  return renderWithIntl(
    <WarehouseEntryActions
      entryId="entry-1"
      quantityScu={32}
      note=""
      systems={SYSTEMS}
      bodies={BODIES}
      terminals={TERMINALS}
      {...props}
    />,
    { locale: "en" },
  );
}

beforeEach(() => {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => ({ ok: true, json: async () => ({}) })),
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("WarehouseEntryActions", () => {
  it("saves edited quantity and note via PATCH", async () => {
    const user = userEvent.setup();
    renderActions();

    await user.click(screen.getByRole("button", { name: "Edit" }));
    const quantity = screen.getByLabelText("Quantity (SCU)");
    await user.clear(quantity);
    await user.type(quantity, "5");
    await user.type(screen.getByLabelText("Note"), "rest");
    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(fetch).toHaveBeenCalledWith(
      "/api/warehouse/entry-1",
      expect.objectContaining({ method: "PATCH" }),
    );
    const body = JSON.parse(
      (vi.mocked(fetch).mock.calls[0][1] as RequestInit).body as string,
    );
    expect(body).toEqual({ quantityScu: 5, note: "rest" });
  });

  it("saves an edited qualityRating via PATCH", async () => {
    const user = userEvent.setup();
    renderActions({ qualityRating: 640 });

    await user.click(screen.getByRole("button", { name: "Edit" }));
    const quality = screen.getByLabelText("Quality (0–1000)");
    expect(quality).toHaveValue(640);
    await user.clear(quality);
    await user.type(quality, "900");
    await user.click(screen.getByRole("button", { name: "Save" }));

    const body = JSON.parse(
      (vi.mocked(fetch).mock.calls[0][1] as RequestInit).body as string,
    );
    expect(body.qualityRating).toBe(900);
  });

  it("cancels editing without a request", async () => {
    const user = userEvent.setup();
    renderActions();

    await user.click(screen.getByRole("button", { name: "Edit" }));
    await user.click(screen.getByRole("button", { name: "Cancel" }));

    expect(fetch).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Edit" })).toBeVisible();
  });

  it("deletes after confirmation", async () => {
    vi.stubGlobal(
      "confirm",
      vi.fn(() => true),
    );
    const user = userEvent.setup();
    renderActions();

    await user.click(screen.getByRole("button", { name: "Delete" }));

    expect(fetch).toHaveBeenCalledWith(
      "/api/warehouse/entry-1",
      expect.objectContaining({ method: "DELETE" }),
    );
  });

  it("does not delete when the confirmation is declined", async () => {
    vi.stubGlobal(
      "confirm",
      vi.fn(() => false),
    );
    const user = userEvent.setup();
    renderActions();

    await user.click(screen.getByRole("button", { name: "Delete" }));

    expect(fetch).not.toHaveBeenCalled();
  });

  it("moves a partial quantity to another location via the move form", async () => {
    const user = userEvent.setup();
    renderActions({ quantityScu: 100 });

    await user.click(screen.getByRole("button", { name: "Move" }));
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

  it("cancels a move without a request", async () => {
    const user = userEvent.setup();
    renderActions({ quantityScu: 100 });

    await user.click(screen.getByRole("button", { name: "Move" }));
    await user.click(screen.getByRole("button", { name: "Cancel" }));

    expect(fetch).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Edit" })).toBeVisible();
  });
});
