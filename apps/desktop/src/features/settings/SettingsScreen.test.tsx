import { fireEvent, render, screen } from "@testing-library/react";
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

let serverLocked = false;
vi.mock("../../lib/config", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../lib/config")>()),
  isServerUrlLocked: () => serverLocked,
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

function mockCommands(overrides: Record<string, unknown> = {}) {
  const defaults: Record<string, unknown> = {
    get_capture_shortcut: { shortcut: "ctrl+alt+r", registered: true },
    get_game_elevation_status: { gameRunning: false, hotkeyBlocked: false },
  };
  invoke.mockImplementation((command: unknown) => {
    const commands = { ...defaults, ...overrides };
    if (typeof command === "string" && command in commands) {
      const value = commands[command];
      return value instanceof Error
        ? Promise.reject(value.message)
        : Promise.resolve(value);
    }
    return Promise.resolve(undefined);
  });
}

beforeEach(() => {
  invoke.mockReset();
  mockCommands();
  saveSetting.mockClear();
  enableAutostart.mockClear();
  openDialog.mockReset();
  serverLocked = false;
});

async function recordHotkey(code: string) {
  const recorder = screen.getByRole("button", { name: "Capture hotkey" });
  await userEvent.click(recorder);
  fireEvent.keyDown(recorder, { code, ctrlKey: true, altKey: true });
}

describe("SettingsScreen", () => {
  it("applies a recorded capture hotkey via the Rust command", async () => {
    renderScreen();

    await recordHotkey("KeyJ");

    expect(invoke).toHaveBeenCalledWith("set_capture_shortcut", {
      shortcut: "ctrl+alt+j",
    });
    expect(await screen.findByText("Hotkey active: Ctrl+Alt+J")).toBeVisible();
    expect(saveSetting).toHaveBeenCalledWith("hotkey", "ctrl+alt+j");
  });

  it("reports a combination taken by another application and keeps the old one", async () => {
    mockCommands({ set_capture_shortcut: new Error("unavailable") });
    renderScreen();

    await recordHotkey("KeyJ");

    expect(
      await screen.findByText(
        "This combination is already in use by another application.",
      ),
    ).toBeVisible();
    expect(saveSetting).not.toHaveBeenCalledWith("hotkey", expect.anything());
  });

  it("reports an unsupported combination", async () => {
    mockCommands({ set_capture_shortcut: new Error("invalid") });
    renderScreen();

    await recordHotkey("KeyJ");

    expect(
      await screen.findByText("This combination is not supported."),
    ).toBeVisible();
    expect(saveSetting).not.toHaveBeenCalledWith("hotkey", expect.anything());
  });

  it("warns when the active hotkey is not registered in the system", async () => {
    mockCommands({
      get_capture_shortcut: { shortcut: "ctrl+alt+r", registered: false },
    });
    renderScreen();

    expect(
      await screen.findByText(
        "The hotkey Ctrl+Alt+R could not be registered — another application is probably using it. Record a different one.",
      ),
    ).toBeVisible();
  });

  it("warns when Star Citizen runs elevated and would block the hotkey", async () => {
    mockCommands({
      get_game_elevation_status: { gameRunning: true, hotkeyBlocked: true },
    });
    renderScreen();

    expect(
      await screen.findByText(
        "Star Citizen is running as administrator — the hotkey will not fire in-game. Run the Companion as administrator or start the RSI Launcher without admin rights.",
      ),
    ).toBeVisible();
  });

  it("shows no elevation warning when the game does not block the hotkey", async () => {
    mockCommands({
      get_game_elevation_status: { gameRunning: true, hotkeyBlocked: false },
    });
    renderScreen();

    await screen.findByRole("button", { name: "Capture hotkey" });
    expect(
      screen.queryByText(/running as administrator/),
    ).not.toBeInTheDocument();
  });

  it("toggles autostart", async () => {
    renderScreen();

    await userEvent.click(screen.getByLabelText("Start with Windows"));

    expect(enableAutostart).toHaveBeenCalled();
    expect(saveSetting).toHaveBeenCalledWith("autostart", true);
  });

  it("offers an editable server URL in dev builds", () => {
    renderScreen();
    expect(screen.getByLabelText("Server URL")).toBeInTheDocument();
  });

  it("pins the server URL in release builds", () => {
    serverLocked = true;
    renderScreen();

    expect(screen.queryByLabelText("Server URL")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Apply server" }),
    ).not.toBeInTheDocument();
    expect(screen.getByText("https://starvein.app")).toBeVisible();
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
