import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { IntlProvider } from "use-intl";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { messages } from "../../i18n/messages";
import { DeviceFlowError } from "./device-flow";
import { LoginScreen } from "./LoginScreen";

const requestDeviceCode = vi.fn();
const pollForToken = vi.fn();
const openUrl = vi.fn();
const setSessionToken = vi.fn();

vi.mock("./device-flow", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./device-flow")>()),
  requestDeviceCode: (...args: unknown[]) => requestDeviceCode(...args),
  pollForToken: (...args: unknown[]) => pollForToken(...args),
}));
vi.mock("@tauri-apps/plugin-opener", () => ({
  openUrl: (...args: unknown[]) => openUrl(...args),
}));
vi.mock("../../lib/secrets", () => ({
  setSessionToken: (...args: unknown[]) => setSessionToken(...args),
}));
vi.mock("../../lib/http", () => ({ fetch: vi.fn() }));

const DEVICE_CODE = {
  deviceCode: "dev-123",
  userCode: "ABCD-EFGH",
  verificationUri: "https://starvein.example/device",
  verificationUriComplete:
    "https://starvein.example/device?user_code=ABCD-EFGH",
  expiresInSeconds: 1800,
  intervalSeconds: 5,
};

function renderScreen(onAuthenticated = vi.fn()) {
  render(
    <IntlProvider locale="en" messages={messages.en}>
      <LoginScreen onAuthenticated={onAuthenticated} />
    </IntlProvider>,
  );
  return onAuthenticated;
}

beforeEach(() => {
  requestDeviceCode.mockReset();
  pollForToken.mockReset();
  openUrl.mockReset();
  setSessionToken.mockReset();
});

describe("LoginScreen", () => {
  it("runs the device flow and hands the token to the app", async () => {
    requestDeviceCode.mockResolvedValue(DEVICE_CODE);
    let releasePoll: (token: string) => void = () => {};
    pollForToken.mockImplementation(
      () => new Promise((resolve) => (releasePoll = resolve)),
    );
    setSessionToken.mockResolvedValue(undefined);
    const onAuthenticated = renderScreen();

    await userEvent.click(
      screen.getByRole("button", { name: "Connect with Discord" }),
    );

    // Code sichtbar, Browser geöffnet, Polling läuft
    expect(await screen.findByText("ABCD-EFGH")).toBeVisible();
    expect(openUrl).toHaveBeenCalledWith(DEVICE_CODE.verificationUriComplete);

    releasePoll("tok-1");
    await screen.findByText("ABCD-EFGH"); // flush microtasks via RTL
    await vi.waitFor(() => {
      expect(setSessionToken).toHaveBeenCalledWith("tok-1");
      expect(onAuthenticated).toHaveBeenCalledWith("tok-1");
    });
  });

  it("shows a retry hint when the user denies access", async () => {
    requestDeviceCode.mockResolvedValue(DEVICE_CODE);
    pollForToken.mockRejectedValue(new DeviceFlowError("denied", "denied"));
    renderScreen();

    await userEvent.click(
      screen.getByRole("button", { name: "Connect with Discord" }),
    );

    expect(
      await screen.findByText("Access was denied in the browser."),
    ).toBeVisible();
    expect(
      screen.getByRole("button", { name: "Connect with Discord" }),
    ).toBeEnabled();
  });

  it("reports an expired code", async () => {
    requestDeviceCode.mockResolvedValue(DEVICE_CODE);
    pollForToken.mockRejectedValue(new DeviceFlowError("expired", "expired"));
    renderScreen();

    await userEvent.click(
      screen.getByRole("button", { name: "Connect with Discord" }),
    );

    expect(
      await screen.findByText("The code expired — please try again."),
    ).toBeVisible();
  });
});
