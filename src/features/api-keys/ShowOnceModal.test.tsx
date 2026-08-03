import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { renderWithIntl } from "@/test/render";
import { ShowOnceModal } from "./ShowOnceModal";

describe("ShowOnceModal", () => {
  it("shows the full key exactly here with a warning", () => {
    renderWithIntl(
      <ShowOnceModal name="bot" fullKey="sv_secret123" onClose={() => {}} />,
    );
    expect(screen.getByText("sv_secret123")).toBeInTheDocument();
    expect(screen.getByText(/shown only once/i)).toBeInTheDocument();
  });

  it("copies the key to the clipboard", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });

    renderWithIntl(
      <ShowOnceModal name="bot" fullKey="sv_secret123" onClose={() => {}} />,
    );
    await userEvent.click(screen.getByRole("button", { name: /copy/i }));
    expect(writeText).toHaveBeenCalledWith("sv_secret123");
  });

  it("closes via the close button", async () => {
    const onClose = vi.fn();
    renderWithIntl(
      <ShowOnceModal name="bot" fullKey="sv_secret123" onClose={onClose} />,
    );
    await userEvent.click(screen.getByRole("button", { name: /close/i }));
    expect(onClose).toHaveBeenCalled();
  });
});
