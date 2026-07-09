import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderWithIntl } from "@/test/render";
import { UserMenu } from "./UserMenu";

const { useSessionMock, signInSocialMock, signOutMock } = vi.hoisted(() => ({
  useSessionMock: vi.fn(),
  signInSocialMock: vi.fn(),
  signOutMock: vi.fn(),
}));

vi.mock("@/lib/auth-client", () => ({
  useSession: useSessionMock,
  signIn: { social: signInSocialMock },
  signOut: signOutMock,
}));

beforeEach(() => {
  useSessionMock.mockReset();
  signInSocialMock.mockClear();
  signOutMock.mockClear();
});

describe("UserMenu", () => {
  it("offers a Discord sign-in when logged out", async () => {
    useSessionMock.mockReturnValue({ data: null, isPending: false });
    const user = userEvent.setup();
    renderWithIntl(<UserMenu />, { locale: "en" });

    const button = screen.getByRole("button", {
      name: "Sign in with Discord",
    });
    await user.click(button);

    expect(signInSocialMock).toHaveBeenCalledWith(
      expect.objectContaining({ provider: "discord" }),
    );
  });

  it("shows name, favorites link and sign-out when logged in", async () => {
    useSessionMock.mockReturnValue({
      data: { user: { id: "u1", name: "MinerMarcell" } },
      isPending: false,
    });
    const user = userEvent.setup();
    renderWithIntl(<UserMenu />, { locale: "en" });

    expect(screen.getByText("MinerMarcell")).toBeVisible();
    expect(screen.getByRole("link", { name: "My favorites" })).toHaveAttribute(
      "href",
      "/favorites",
    );

    await user.click(screen.getByRole("button", { name: "Sign out" }));
    expect(signOutMock).toHaveBeenCalled();
  });
});
