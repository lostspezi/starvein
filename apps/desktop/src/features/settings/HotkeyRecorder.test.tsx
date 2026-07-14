import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { IntlProvider } from "use-intl";
import { describe, expect, it, vi } from "vitest";
import { messages } from "../../i18n/messages";
import { HotkeyRecorder } from "./HotkeyRecorder";

function renderRecorder(onRecord = vi.fn()) {
  render(
    <IntlProvider locale="en" messages={messages.en}>
      <HotkeyRecorder
        value="ctrl+alt+r"
        label="Capture hotkey"
        onRecord={onRecord}
      />
    </IntlProvider>,
  );
  return onRecord;
}

describe("HotkeyRecorder", () => {
  it("shows the current combo and is not a text input", () => {
    renderRecorder();

    expect(
      screen.getByRole("button", { name: "Capture hotkey" }),
    ).toHaveTextContent("Ctrl+Alt+R");
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
  });

  it("records a pressed combination after being activated", async () => {
    const onRecord = renderRecorder();
    const recorder = screen.getByRole("button", { name: "Capture hotkey" });

    await userEvent.click(recorder);
    expect(recorder).toHaveTextContent("Press the new key combination");

    fireEvent.keyDown(recorder, { code: "KeyM", ctrlKey: true, altKey: true });

    expect(onRecord).toHaveBeenCalledWith("ctrl+alt+m");
    expect(recorder).toHaveTextContent("Ctrl+Alt+R");
  });

  it("keeps waiting while only modifiers are held", async () => {
    const onRecord = renderRecorder();
    const recorder = screen.getByRole("button", { name: "Capture hotkey" });

    await userEvent.click(recorder);
    fireEvent.keyDown(recorder, { code: "ControlLeft", ctrlKey: true });

    expect(onRecord).not.toHaveBeenCalled();
    expect(recorder).toHaveTextContent("Press the new key combination");
  });

  it("cancels recording with Escape", async () => {
    const onRecord = renderRecorder();
    const recorder = screen.getByRole("button", { name: "Capture hotkey" });

    await userEvent.click(recorder);
    fireEvent.keyDown(recorder, { code: "Escape", key: "Escape" });

    expect(onRecord).not.toHaveBeenCalled();
    expect(recorder).toHaveTextContent("Ctrl+Alt+R");
  });
});
