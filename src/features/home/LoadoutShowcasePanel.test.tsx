import { screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Loadout } from "@/features/loadouts/loadouts.schema";
import { renderWithIntl } from "@/test/render";
import { LoadoutShowcasePanel } from "./LoadoutShowcasePanel";
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
  return {
    loadout,
    vehicleName: "MOLE",
    laserSummary: "Helix II",
    breakabilityMass: 45230,
  };
}

const fullShowcase: LoadoutShowcase = {
  feature: showcaseLoadout("l-feature", "Feature Loadout"),
  top: [],
  newest: [
    showcaseLoadout("l-new1", "Neu Eins"),
    showcaseLoadout("l-new2", "Neu Zwei"),
  ],
};

const emptyShowcase: LoadoutShowcase = { feature: null, top: [], newest: [] };

function renderPanel(showcase: LoadoutShowcase) {
  renderWithIntl(
    <LoadoutShowcasePanel
      showcase={showcase}
      currentPatchVersion="4.7"
      viewerUserId={null}
    />,
    { locale: "en" },
  );
}

describe("LoadoutShowcasePanel", () => {
  it("shows the heading, the featured loadout and the newest list", () => {
    renderPanel(fullShowcase);

    expect(
      screen.getByRole("heading", { level: 2, name: "Community loadouts" }),
    ).toBeVisible();
    expect(screen.getByText("Top voted")).toBeVisible();
    expect(screen.getByRole("heading", { name: "Newest" })).toBeVisible();

    for (const name of ["Feature Loadout", "Neu Eins", "Neu Zwei"]) {
      expect(screen.getByRole("link", { name })).toBeVisible();
    }

    expect(
      screen.getByRole("link", { name: "Browse all loadouts" }),
    ).toHaveAttribute("href", "/loadouts");
  });

  it("passes the breakability stat through to the tiles", () => {
    renderPanel(fullShowcase);
    // Feature-Kachel + 2 newest-Karten
    expect(screen.getAllByText("cracks up to 45.2K mass")).toHaveLength(3);
  });

  it("shows an empty state without loadout tiles when nothing is public", () => {
    renderPanel(emptyShowcase);

    expect(screen.queryByRole("article")).toBeNull();
    expect(
      screen.getByText("No public loadouts yet. Build the first one!"),
    ).toBeVisible();
  });
});
