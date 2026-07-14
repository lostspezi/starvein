import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { IntlProvider } from "use-intl";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { messages } from "../../i18n/messages";
import { SettingsProvider } from "../../SettingsContext";
import type { AppSettings } from "../../lib/settings";
import { SettingsScreen } from "./SettingsScreen";

const invoke = vi.fn();
const saveSetting = vi.fn().mockResolvedValue(undefined);
const enableAutostart = vi.fn().mockResolvedValue(undefined);
const disableAutostart = vi.fn().mockResolvedValue(undefined);
const openDialog = vi.fn();

vi.mock("@tauri-apps/api/core", () => ({
  invoke: (...args: unknown[]) => invoke(...args),
}));
vi.mock("../../lib/settings", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../lib/settings")>()),
  saveSetting: (...args: unknown[]) => saveSetting(...args),
}));
vi.mock("@tauri-apps/plugin-autostart", () => ({
  enable: (...args: unknown[]) => enableAutostart(...args),
  disable: (...args: unknown[]) => disableAutostart(...args),
}));
vi.mock("@tauri-apps/plugin-dialog", () => ({
  open: (...args: unknown[]) => openDialog(...args),
}));

const SETTINGS: AppSettings = {
  locale: "en",
  serverUrl: null,
  hotkey: null,
  scLogPath: null,
  autostart: false,
};

function renderScreen() {
  render(
    <IntlProvider locale="en" messages={messages.en}>
      <SettingsProvider initial={SETTINGS}>
        <SettingsScreen onClose={vi.fn()} />
      </SettingsProvider>
    </IntlProvider>,
  );
}

beforeEach(() => {
  invoke.mockReset();
  saveSetting.mockClear();
  enableAutostart.mockClear();
  openDialog.mockReset();
});

describe("SettingsScreen", () => {
  it("applies a new capture hotkey via the Rust command", async () => {
    invoke.mockResolvedValue(undefined);
    renderScreen();

    const input = screen.getByLabelText("Capture hotkey");
    await userEvent.clear(input);
    await userEvent.type(input, "ctrl+alt+j");
    await userEvent.click(screen.getByRole("button", { name: "Apply hotkey" }));

    expect(invoke).toHaveBeenCalledWith("set_capture_shortcut", {
      shortcut: "ctrl+alt+j",
    });
    expect(saveSetting).toHaveBeenCalledWith("hotkey", "ctrl+alt+j");
  });

  it("shows an error for invalid hotkeys and keeps the old one", async () => {
    invoke.mockRejectedValue("invalid shortcut");
    renderScreen();

    await userEvent.click(screen.getByRole("button", { name: "Apply hotkey" }));

    expect(
      await screen.findByText("This hotkey could not be registered."),
    ).toBeVisible();
    expect(saveSetting).not.toHaveBeenCalledWith("hotkey", expect.anything());
  });

  it("toggles autostart", async () => {
    renderScreen();

    await userEvent.click(screen.getByLabelText("Start with Windows"));

    expect(enableAutostart).toHaveBeenCalled();
    expect(saveSetting).toHaveBeenCalledWith("autostart", true);
  });

  it("stores the picked Game.log path", async () => {
    openDialog.mockResolvedValue("C:\\Games\\StarCitizen\\LIVE\\Game.log");
    renderScreen();

    await userEvent.click(
      screen.getByRole("button", { name: "Pick Game.log …" }),
    );

    expect(
      await screen.findByText(/StarCitizen\\LIVE\\Game\.log/),
    ).toBeVisible();
    expect(saveSetting).toHaveBeenCalledWith(
      "scLogPath",
      "C:\\Games\\StarCitizen\\LIVE\\Game.log",
    );
  });
});
