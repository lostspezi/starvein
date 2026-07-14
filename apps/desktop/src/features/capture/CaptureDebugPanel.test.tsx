import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { IntlProvider } from "use-intl";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { messages } from "../../i18n/messages";
import type { OcrCapture } from "../../lib/tauri";
import type { AppSettings } from "../../lib/settings";
import { SettingsProvider } from "../../SettingsContext";
import { CaptureDebugPanel } from "./CaptureDebugPanel";

const captureAndOcr = vi.fn();

vi.mock("../../lib/tauri", () => ({
  captureAndOcr: (...args: unknown[]) => captureAndOcr(...args),
  onCaptureResult: vi.fn().mockResolvedValue(() => {}),
  onCaptureError: vi.fn().mockResolvedValue(() => {}),
}));

const CAPTURE: OcrCapture = {
  source: "window",
  width: 1920,
  height: 1080,
  lines: [
    { text: "QUANTAINIUM 32 SCU", words: [] },
    { text: "PROCESSING TIME 2H 5M", words: [] },
  ],
};

const SETTINGS: AppSettings = {
  locale: "en",
  serverUrl: null,
  hotkey: null,
  scLogPath: null,
  autostart: false,
};

function renderPanel(settings: AppSettings = SETTINGS) {
  return render(
    <IntlProvider locale="en" messages={messages.en}>
      <SettingsProvider initial={settings}>
        <CaptureDebugPanel />
      </SettingsProvider>
    </IntlProvider>,
  );
}

beforeEach(() => {
  captureAndOcr.mockReset();
});

async function expandPanel() {
  await userEvent.click(screen.getByText("OCR debug (raw capture)"));
}

describe("CaptureDebugPanel", () => {
  it("runs a manual capture and lists the raw OCR lines", async () => {
    captureAndOcr.mockResolvedValue(CAPTURE);
    renderPanel();
    await expandPanel();

    await userEvent.click(
      screen.getByRole("button", { name: "Test capture now" }),
    );

    expect(await screen.findByText("QUANTAINIUM 32 SCU")).toBeVisible();
    expect(screen.getByText("PROCESSING TIME 2H 5M")).toBeVisible();
    expect(screen.getByText(/1920\s?×\s?1080/)).toBeVisible();
  });

  it("shows the configured hotkey in the hint", async () => {
    renderPanel({ ...SETTINGS, hotkey: "ctrl+alt+j" });
    await expandPanel();

    expect(screen.getByText(/Ctrl\+Alt\+J/)).toBeVisible();
  });

  it("falls back to the default hotkey in the hint", async () => {
    renderPanel();
    await expandPanel();

    expect(screen.getByText(/Ctrl\+Alt\+R/)).toBeVisible();
  });

  it("shows an error when the capture fails", async () => {
    captureAndOcr.mockRejectedValue("no primary monitor found");
    renderPanel();
    await expandPanel();

    await userEvent.click(
      screen.getByRole("button", { name: "Test capture now" }),
    );

    expect(
      await screen.findByText("Capture failed: no primary monitor found"),
    ).toBeVisible();
  });
});
