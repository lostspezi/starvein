import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderWithIntl } from "@/test/render";
import { DeviceApprovePanel } from "./DeviceApprovePanel";

const approve = vi.fn();
const deny = vi.fn();

vi.mock("@/lib/auth-client", () => ({
  authClient: {
    device: {
      approve: (...args: unknown[]) => approve(...args),
      deny: (...args: unknown[]) => deny(...args),
    },
  },
}));

beforeEach(() => {
  approve.mockReset();
  deny.mockReset();
});

describe("DeviceApprovePanel", () => {
  it("prefills the user code from the URL", () => {
    renderWithIntl(<DeviceApprovePanel initialUserCode="ABCD-EFGH" />);
    expect(screen.getByLabelText("Device code")).toHaveValue("ABCD-EFGH");
  });

  it("approves the device and confirms success", async () => {
    approve.mockResolvedValue({ data: { success: true }, error: null });
    renderWithIntl(<DeviceApprovePanel initialUserCode="ABCD-EFGH" />);

    await userEvent.click(
      screen.getByRole("button", { name: "Connect device" }),
    );

    expect(approve).toHaveBeenCalledWith({ userCode: "ABCD-EFGH" });
    expect(
      await screen.findByText(
        "Device connected — you can return to the companion app.",
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

  it("denies the device on request", async () => {
    deny.mockResolvedValue({ data: { success: true }, error: null });
    renderWithIntl(<DeviceApprovePanel initialUserCode="ABCD-EFGH" />);

    await userEvent.click(screen.getByRole("button", { name: "Deny" }));

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
