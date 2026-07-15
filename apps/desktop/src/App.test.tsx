import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { IntlProvider } from "use-intl";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { App } from "./App";
import { messages } from "./i18n/messages";
import type { AppSettings } from "./lib/settings";
import type { AvailableUpdate } from "./lib/updater";
import { SettingsProvider } from "./SettingsContext";

const checkForUpdate = vi.fn<() => Promise<AvailableUpdate | null>>();
const getSessionToken = vi.fn().mockResolvedValue(null);

vi.mock("./lib/updater", () => ({
  checkForUpdate: () => checkForUpdate(),
}));
vi.mock("./lib/secrets", () => ({
  getSessionToken: () => getSessionToken(),
  clearSessionToken: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("./lib/tauri", () => ({
  onCaptureResult: vi.fn().mockResolvedValue(() => {}),
  onCaptureError: vi.fn().mockResolvedValue(() => {}),
  captureAndOcr: vi.fn(),
}));

const SETTINGS: AppSettings = {
  locale: "en",
  serverUrl: null,
  hotkey: null,
  scLogPath: null,
  autostart: false,
};

function renderApp() {
  render(
    <IntlProvider locale="en" messages={messages.en}>
      <SettingsProvider initial={SETTINGS}>
        <App />
      </SettingsProvider>
    </IntlProvider>,
  );
}

beforeEach(() => {
  checkForUpdate.mockReset();
});

describe("App update check on startup", () => {
  it("offers an available update and installs on confirmation", async () => {
    const install = vi.fn().mockResolvedValue(undefined);
    checkForUpdate.mockResolvedValue({ version: "0.3.0", install });
    renderApp();

    expect(
      await screen.findByText("Version 0.3.0 is available — install now?"),
    ).toBeVisible();

    await userEvent.click(screen.getByRole("button", { name: "Update now" }));
    expect(install).toHaveBeenCalled();
  });

  it("continues without a prompt when the app is up to date", async () => {
    checkForUpdate.mockResolvedValue(null);
    renderApp();

    expect(await screen.findByText("Connect with Discord")).toBeVisible();
    expect(screen.queryByText(/install now\?/)).not.toBeInTheDocument();
  });

  it("dismissing the prompt keeps the app running", async () => {
    const install = vi.fn();
    checkForUpdate.mockResolvedValue({ version: "0.3.0", install });
    renderApp();

    await userEvent.click(await screen.findByRole("button", { name: "Later" }));

    expect(install).not.toHaveBeenCalled();
    expect(screen.queryByText(/install now\?/)).not.toBeInTheDocument();
    expect(await screen.findByText("Connect with Discord")).toBeVisible();
  });
});
