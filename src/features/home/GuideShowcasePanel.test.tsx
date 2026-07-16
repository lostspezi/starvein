import { screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Guide } from "@/features/guides/guides.schema";
import { renderWithIntl } from "@/test/render";
import type { GuideShowcase } from "./guide-showcase.service";
import { GuideShowcasePanel } from "./GuideShowcasePanel";

const { useSessionMock } = vi.hoisted(() => ({ useSessionMock: vi.fn() }));

vi.mock("@/lib/auth-client", () => ({
  useSession: useSessionMock,
  signIn: { social: vi.fn() },
}));

beforeEach(() => {
  useSessionMock.mockReturnValue({ data: null, isPending: false });
});

function guide(id: string, title: string, votesUp = 0): Guide {
  return {
    id,
    tags: ["mining"],
    translations: [
      {
        language: "en",
        title,
        description: undefined,
        content: {
          type: "doc",
          content: [{ type: "paragraph" }],
        } as Guide["translations"][number]["content"],
        searchText: title.toLowerCase(),
      },
    ],
    ownerUserId: "user-1",
    isPublic: true,
    votes: { up: votesUp },
    voters: [],
    patchVersion: "4.7",
    createdAt: "2026-07-13T08:00:00.000Z",
    updatedAt: "2026-07-13T08:00:00.000Z",
  };
}

const fullShowcase: GuideShowcase = {
  feature: guide("g-feature", "Featured Guide", 12),
  newest: [
    guide("g-new1", "Neuer Guide Eins"),
    guide("g-new2", "Neuer Guide Zwei"),
  ],
};

const emptyShowcase: GuideShowcase = { feature: null, newest: [] };

function renderPanel(showcase: GuideShowcase) {
  renderWithIntl(
    <GuideShowcasePanel
      showcase={showcase}
      language="en"
      viewerUserId={null}
    />,
    { locale: "en" },
  );
}

describe("GuideShowcasePanel", () => {
  it("shows the heading, the featured guide and the newest list", () => {
    renderPanel(fullShowcase);

    expect(
      screen.getByRole("heading", { level: 2, name: "Community guides" }),
    ).toBeVisible();
    expect(screen.getByText("Top voted")).toBeVisible();
    expect(screen.getByRole("heading", { name: "Newest" })).toBeVisible();

    expect(
      screen.getByRole("link", { name: "Featured Guide" }),
    ).toHaveAttribute("href", "/guides/g-feature");
    expect(screen.getByText("12")).toBeVisible();
    for (const name of ["Neuer Guide Eins", "Neuer Guide Zwei"]) {
      expect(screen.getByRole("link", { name })).toBeVisible();
    }

    expect(
      screen.getByRole("link", { name: "Browse all guides" }),
    ).toHaveAttribute("href", "/guides");
  });

  it("shows an empty state with a write link when no guides exist", () => {
    renderPanel(emptyShowcase);

    expect(screen.queryByRole("article")).toBeNull();
    expect(
      screen.getByText("No guides yet. Be the first to write one!"),
    ).toBeVisible();
    expect(screen.getByRole("link", { name: "Write a guide" })).toHaveAttribute(
      "href",
      "/guides/new",
    );
  });
});
