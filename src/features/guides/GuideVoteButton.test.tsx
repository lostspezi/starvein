import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderWithIntl } from "@/test/render";
import { GuideVoteButton } from "./GuideVoteButton";

const { useSessionMock, signInSocialMock } = vi.hoisted(() => ({
  useSessionMock: vi.fn(),
  signInSocialMock: vi.fn(),
}));

vi.mock("@/lib/auth-client", () => ({
  useSession: useSessionMock,
  signIn: { social: signInSocialMock },
}));

const fetchMock = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal("fetch", fetchMock);
  useSessionMock.mockReturnValue({ data: null, isPending: false });
});

function renderButton(
  overrides: Partial<React.ComponentProps<typeof GuideVoteButton>> = {},
) {
  return renderWithIntl(
    <GuideVoteButton
      guideId="guide-1"
      initialVotes={3}
      initialHasVoted={false}
      isOwner={false}
      {...overrides}
    />,
    { locale: "en" },
  );
}

describe("GuideVoteButton", () => {
  it("shows the vote count", () => {
    renderButton();
    expect(screen.getByText("3")).toBeVisible();
  });

  it("starts the Discord sign-in when logged out", async () => {
    const user = userEvent.setup();
    renderButton();

    await user.click(screen.getByRole("button", { name: "Sign in to vote" }));

    expect(signInSocialMock).toHaveBeenCalledWith(
      expect.objectContaining({ provider: "discord" }),
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("toggles the vote via the guides API when logged in", async () => {
    useSessionMock.mockReturnValue({
      data: { user: { id: "user-2", name: "Miner" } },
      isPending: false,
    });
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ votes: { up: 4 }, hasVoted: true }), {
        status: 200,
      }),
    );
    const user = userEvent.setup();
    renderButton();

    await user.click(screen.getByRole("button", { name: "Upvote guide" }));

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/guides/guide-1/vote",
      expect.objectContaining({ method: "POST" }),
    );
    expect(await screen.findByText("4")).toBeVisible();
    expect(
      screen.getByRole("button", { name: "Remove your vote" }),
    ).toHaveAttribute("aria-pressed", "true");
  });

  it("renders a static count for the owner", () => {
    renderButton({ isOwner: true });
    expect(screen.queryByRole("button")).toBeNull();
    expect(screen.getByText("3")).toBeVisible();
  });
});
