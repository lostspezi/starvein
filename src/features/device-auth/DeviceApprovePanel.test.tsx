import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderWithIntl } from "@/test/render";
import { DeviceApprovePanel } from "./DeviceApprovePanel";

const verify = vi.fn();
const approve = vi.fn();
const deny = vi.fn();

vi.mock("@/lib/auth-client", () => ({
  authClient: {
    // Better-Auth-Client-Proxy: device ist aufrufbar (GET /device = Claim)
    // und trägt approve/deny als Unterfunktionen.
    device: Object.assign((...args: unknown[]) => verify(...args), {
      approve: (...args: unknown[]) => approve(...args),
      deny: (...args: unknown[]) => deny(...args),
    }),
  },
}));

beforeEach(() => {
  verify.mockReset().mockResolvedValue({
    data: { status: "pending" },
    error: null,
  });
  approve.mockReset();
  deny.mockReset();
});

describe("DeviceApprovePanel", () => {
  it("prefills the user code from the URL", () => {
    renderWithIntl(<DeviceApprovePanel initialUserCode="ABCD-EFGH" />);
    expect(screen.getByLabelText("Device code")).toHaveValue("ABCD-EFGH");
  });

  it("claims the code before approving and confirms success", async () => {
    approve.mockResolvedValue({ data: { success: true }, error: null });
    renderWithIntl(<DeviceApprovePanel initialUserCode="ABCD-EFGH" />);

    await userEvent.click(
      screen.getByRole("button", { name: "Connect device" }),
    );

    // Claim (GET /device) MUSS vor approve laufen — sonst lehnt Better Auth
    // mit DEVICE_CODE_NOT_CLAIMED ab.
    expect(verify).toHaveBeenCalledWith({
      query: { user_code: "ABCD-EFGH" },
    });
    expect(approve).toHaveBeenCalledWith({ userCode: "ABCD-EFGH" });
    expect(verify.mock.invocationCallOrder[0]).toBeLessThan(
      approve.mock.invocationCallOrder[0],
    );
    expect(
      await screen.findByText(
        "Device connected — you can return to the companion app.",
      ),
    ).toBeVisible();
  });

  it("shows an error when the claim fails", async () => {
    verify.mockResolvedValue({ data: null, error: { error: "expired_token" } });
    renderWithIntl(<DeviceApprovePanel initialUserCode="ABCD-EFGH" />);

    await userEvent.click(
      screen.getByRole("button", { name: "Connect device" }),
    );

    expect(approve).not.toHaveBeenCalled();
    expect(
      await screen.findByText(
        "The code could not be confirmed. It may have expired — request a new one in the app.",
      ),
    ).toBeVisible();
  });

  it("shows an error when approval fails", async () => {
    approve.mockResolvedValue({
      data: null,
      error: { error: "expired_token" },
    });
    renderWithIntl(<DeviceApprovePanel initialUserCode="ABCD-EFGH" />);

    await userEvent.click(
      screen.getByRole("button", { name: "Connect device" }),
    );

    expect(
      await screen.findByText(
        "The code could not be confirmed. It may have expired — request a new one in the app.",
      ),
    ).toBeVisible();
  });

  it("claims the code before denying", async () => {
    deny.mockResolvedValue({ data: { success: true }, error: null });
    renderWithIntl(<DeviceApprovePanel initialUserCode="ABCD-EFGH" />);

    await userEvent.click(screen.getByRole("button", { name: "Deny" }));

    expect(verify).toHaveBeenCalled();
    expect(deny).toHaveBeenCalledWith({ userCode: "ABCD-EFGH" });
    expect(await screen.findByText("Device access denied.")).toBeVisible();
  });

  it("keeps the buttons disabled without a code", () => {
    renderWithIntl(<DeviceApprovePanel initialUserCode="" />);
    expect(
      screen.getByRole("button", { name: "Connect device" }),
    ).toBeDisabled();
    expect(screen.getByRole("button", { name: "Deny" })).toBeDisabled();
  });
});
