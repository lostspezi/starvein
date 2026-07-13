import { screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Loadout } from "@/features/loadouts/loadouts.schema";
import { renderWithIntl } from "@/test/render";
import { HomeBento } from "./HomeBento";
import type {
  LoadoutShowcase,
  ShowcaseLoadout,
} from "./loadout-showcase.service";

const { useSessionMock } = vi.hoisted(() => ({ useSessionMock: vi.fn() }));

vi.mock("@/lib/auth-client", () => ({
  useSession: useSessionMock,
  signIn: { social: vi.fn() },
}));

beforeEach(() => {
  useSessionMock.mockReturnValue({ data: null, isPending: false });
});

function showcaseLoadout(id: string, name: string): ShowcaseLoadout {
  const loadout: Loadout = {
    id,
    name,
    method: "ship",
    vehicleCode: "mole",
    hardpoints: [{ hardpointIndex: 0, laserCode: "helix-ii", moduleCodes: [] }],
    gadgetCodes: [],
    ownerUserId: "user-1",
    isPublic: true,
    votes: { up: 3 },
    voters: [],
    patchVersion: "4.7",
    createdAt: "2026-07-13T08:00:00.000Z",
    updatedAt: "2026-07-13T08:00:00.000Z",
  };
  return { loadout, vehicleName: "MOLE", laserSummary: "Helix II" };
}

const fullShowcase: LoadoutShowcase = {
  feature: showcaseLoadout("l-feature", "Feature Loadout"),
  top: [
    showcaseLoadout("l-top1", "Top Eins"),
    showcaseLoadout("l-top2", "Top Zwei"),
    showcaseLoadout("l-top3", "Top Drei"),
  ],
  newest: [
    showcaseLoadout("l-new1", "Neu Eins"),
    showcaseLoadout("l-new2", "Neu Zwei"),
  ],
};

const emptyShowcase: LoadoutShowcase = { feature: null, top: [], newest: [] };

function renderBento(showcase: LoadoutShowcase) {
  renderWithIntl(
    <HomeBento
      showcase={showcase}
      oreCount={40}
      locationCount={120}
      loadoutCount={9}
      currentPatchVersion="4.7"
      viewerUserId={null}
    />,
    { locale: "en" },
  );
}

describe("HomeBento", () => {
  it("renders section heading, lists, stats and CTA for a full showcase", () => {
    renderBento(fullShowcase);

    expect(
      screen.getByRole("heading", { level: 2, name: "Community loadouts" }),
    ).toBeVisible();
    expect(screen.getByRole("heading", { name: "Top rated" })).toBeVisible();
    expect(screen.getByRole("heading", { name: "Newest" })).toBeVisible();

    for (const name of [
      "Feature Loadout",
      "Top Eins",
      "Top Zwei",
      "Top Drei",
      "Neu Eins",
      "Neu Zwei",
    ]) {
      expect(screen.getByRole("link", { name })).toBeVisible();
    }

    expect(screen.getByText("120")).toBeVisible();
    expect(screen.getByRole("link", { name: "Create loadout" })).toBeVisible();
    expect(
      screen.getByRole("link", { name: "Browse all loadouts" }),
    ).toBeVisible();
  });

  it("keeps stats and CTA but drops loadout tiles when empty", () => {
    renderBento(emptyShowcase);

    expect(screen.queryByRole("heading", { name: "Top rated" })).toBeNull();
    expect(screen.queryByRole("heading", { name: "Newest" })).toBeNull();
    expect(screen.queryByRole("article")).toBeNull();

    expect(screen.getByText("The database")).toBeVisible();
    expect(screen.getByRole("link", { name: "Create loadout" })).toBeVisible();
  });

  it("fans out as a bento grid from md upward", () => {
    renderBento(fullShowcase);

    const section = screen
      .getByRole("heading", { level: 2, name: "Community loadouts" })
      .closest("section");
    const grid = section?.querySelector("div.grid");
    expect(grid?.className).toContain("grid-cols-1");
    expect(grid?.className).toContain("md:grid-cols-2");
    expect(grid?.className).toContain("lg:grid-cols-4");

    const featureWrapper = screen
      .getByRole("link", { name: "Feature Loadout" })
      .closest("div.md\\:col-span-2");
    expect(featureWrapper?.className).toContain("lg:row-span-2");
  });
});
