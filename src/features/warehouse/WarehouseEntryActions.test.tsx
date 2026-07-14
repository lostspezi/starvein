import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderWithIntl } from "@/test/render";
import { WarehouseEntryActions } from "./WarehouseEntryActions";

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
    renderWithIntl(
      <WarehouseEntryActions entryId="entry-1" quantityScu={32} note="" />,
      { locale: "en" },
    );

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

  it("cancels editing without a request", async () => {
    const user = userEvent.setup();
    renderWithIntl(
      <WarehouseEntryActions entryId="entry-1" quantityScu={32} note="" />,
      { locale: "en" },
    );

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
    renderWithIntl(
      <WarehouseEntryActions entryId="entry-1" quantityScu={32} note="" />,
      { locale: "en" },
    );

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
    renderWithIntl(
      <WarehouseEntryActions entryId="entry-1" quantityScu={32} note="" />,
      { locale: "en" },
    );

    await user.click(screen.getByRole("button", { name: "Delete" }));

    expect(fetch).not.toHaveBeenCalled();
  });
});
