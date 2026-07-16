import { screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CURRENT_PATCH_VERSION } from "@/lib/patch";
import { renderWithIntl } from "@/test/render";
import { GuideCard } from "./GuideCard";
import type { Guide } from "./guides.schema";

const { useSessionMock } = vi.hoisted(() => ({ useSessionMock: vi.fn() }));

vi.mock("@/lib/auth-client", () => ({
  useSession: useSessionMock,
  signIn: { social: vi.fn() },
}));

beforeEach(() => {
  useSessionMock.mockReturnValue({ data: null, isPending: false });
});

const guide: Guide = {
  id: "guide-1",
  tags: ["mining", "quantainium"],
  translations: [
    {
      language: "en",
      title: "Mining Quantainium in Aaron Halo",
      description: "Where to look and how to scan",
      content: { type: "doc", content: [{ type: "paragraph" }] },
      searchText: "mining quantainium",
    },
  ],
  ownerUserId: "owner-1",
  isPublic: true,
  votes: { up: 7 },
  voters: ["user-9"],
  // "aktuell" heißt: gleicher Patch wie die App-Konstante — bump-fest
  patchVersion: CURRENT_PATCH_VERSION,
  createdAt: "2026-07-13T08:00:00.000Z",
  updatedAt: "2026-07-13T08:00:00.000Z",
};

function renderCard(
  overrides: Partial<React.ComponentProps<typeof GuideCard>> = {},
) {
  renderWithIntl(
    <GuideCard
      guide={guide}
      language="en"
      viewerUserId={null}
      {...overrides}
    />,
    { locale: "en" },
  );
}

describe("GuideCard", () => {
  it("links the title to the detail page and shows the vote count", () => {
    renderCard();

    const link = screen.getByRole("link", {
      name: "Mining Quantainium in Aaron Halo",
    });
    expect(link).toHaveAttribute("href", "/guides/guide-1");
    expect(screen.getByText("Where to look and how to scan")).toBeVisible();
    expect(screen.getByText("7")).toBeVisible();
    expect(
      screen.getByRole("button", { name: "Sign in to vote" }),
    ).toBeVisible();
  });

  it("renders a static vote count for the owner", () => {
    renderCard({ viewerUserId: "owner-1" });
    expect(screen.queryByRole("button")).toBeNull();
    expect(screen.getByText("7")).toBeVisible();
  });

  it("marks guides from older patches", () => {
    renderCard({ guide: { ...guide, patchVersion: "4.5" } });
    expect(screen.getByText("Patch 4.5")).toBeVisible();
  });

  it("shows no patch badge for current guides", () => {
    renderCard();
    expect(screen.queryByText(/^Patch /)).toBeNull();
  });
});
