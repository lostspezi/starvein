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

function mockSession(user: Record<string, unknown>) {
  useSessionMock.mockReturnValue({ data: { user }, isPending: false });
}

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

  it("renders an avatar trigger with the Discord image and a closed panel", () => {
    mockSession({
      id: "u1",
      name: "MinerMarcell",
      image: "https://cdn.discordapp.com/avatars/u1/abc.png",
    });
    renderWithIntl(<UserMenu />, { locale: "en" });

    const trigger = screen.getByRole("button", {
      name: "User menu for MinerMarcell",
    });
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    expect(trigger.querySelector("img")).toHaveAttribute(
      "src",
      "https://cdn.discordapp.com/avatars/u1/abc.png",
    );
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });

  it("falls back to the name initial when no avatar image exists", () => {
    mockSession({ id: "u1", name: "Miner Joe", image: null });
    renderWithIntl(<UserMenu />, { locale: "en" });

    const trigger = screen.getByRole("button", {
      name: "User menu for Miner Joe",
    });
    expect(trigger.querySelector("img")).not.toBeInTheDocument();
    expect(trigger).toHaveTextContent("M");
  });

  it("opens the panel with favorites and loadouts links on click", async () => {
    mockSession({ id: "u1", name: "MinerMarcell", image: null });
    const user = userEvent.setup();
    renderWithIntl(<UserMenu />, { locale: "en" });

    const trigger = screen.getByRole("button", {
      name: "User menu for MinerMarcell",
    });
    await user.click(trigger);

    expect(trigger).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("link", { name: "My favorites" })).toHaveAttribute(
      "href",
      "/favorites",
    );
    expect(screen.getByRole("link", { name: "My loadouts" })).toHaveAttribute(
      "href",
      "/loadouts/mine",
    );
  });

  it("shows the admin link only for admin sessions", async () => {
    mockSession({ id: "u1", name: "Admin Anna", role: "admin", image: null });
    const user = userEvent.setup();
    renderWithIntl(<UserMenu />, { locale: "en" });

    await user.click(
      screen.getByRole("button", { name: "User menu for Admin Anna" }),
    );

    expect(screen.getByRole("link", { name: "Admin" })).toHaveAttribute(
      "href",
      "/admin",
    );
  });

  it("hides the admin link for regular users", async () => {
    mockSession({ id: "u1", name: "Miner Joe", role: "user", image: null });
    const user = userEvent.setup();
    renderWithIntl(<UserMenu />, { locale: "en" });

    await user.click(
      screen.getByRole("button", { name: "User menu for Miner Joe" }),
    );

    expect(
      screen.queryByRole("link", { name: "Admin" }),
    ).not.toBeInTheDocument();
  });

  it("signs out via the panel and closes it", async () => {
    mockSession({ id: "u1", name: "MinerMarcell", image: null });
    const user = userEvent.setup();
    renderWithIntl(<UserMenu />, { locale: "en" });

    const trigger = screen.getByRole("button", {
      name: "User menu for MinerMarcell",
    });
    await user.click(trigger);
    await user.click(screen.getByRole("button", { name: "Sign out" }));

    expect(signOutMock).toHaveBeenCalled();
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });

  it("closes on Escape and restores focus to the trigger", async () => {
    mockSession({ id: "u1", name: "MinerMarcell", image: null });
    const user = userEvent.setup();
    renderWithIntl(<UserMenu />, { locale: "en" });

    const trigger = screen.getByRole("button", {
      name: "User menu for MinerMarcell",
    });
    await user.click(trigger);
    await user.keyboard("{Escape}");

    expect(screen.queryByRole("link")).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it("closes when focus leaves the menu", async () => {
    mockSession({ id: "u1", name: "MinerMarcell", image: null });
    const user = userEvent.setup();
    renderWithIntl(
      <>
        <UserMenu />
        <button type="button">outside</button>
      </>,
      { locale: "en" },
    );

    await user.click(
      screen.getByRole("button", { name: "User menu for MinerMarcell" }),
    );
    expect(screen.getByRole("link", { name: "My favorites" })).toBeVisible();

    await user.click(screen.getByRole("button", { name: "outside" }));

    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });
});
