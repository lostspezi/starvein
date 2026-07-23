import { screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Loadout } from "@/features/loadouts/loadouts.schema";
import { renderWithIntl } from "@/test/render";
import { FeatureLoadoutTile } from "./FeatureLoadoutTile";

const { useSessionMock } = vi.hoisted(() => ({ useSessionMock: vi.fn() }));

vi.mock("@/lib/auth-client", () => ({
  useSession: useSessionMock,
  signIn: { social: vi.fn() },
}));

beforeEach(() => {
  useSessionMock.mockReturnValue({ data: null, isPending: false });
});

const loadout: Loadout = {
  id: "loadout-1",
  name: "Quantainium MOLE",
  description: "Voll auf Instabilität optimiert.",
  method: "ship",
  vehicleCode: "mole",
  hardpoints: [{ hardpointIndex: 0, laserCode: "helix-ii", moduleCodes: [] }],
  gadgetCodes: [],
  ownerUserId: "user-1",
  isPublic: true,
  votes: { up: 12 },
  voters: [],
  patchVersion: "4.7",
  createdAt: "2026-07-13T08:00:00.000Z",
  updatedAt: "2026-07-13T08:00:00.000Z",
};

function renderTile(
  overrides: Partial<Loadout> = {},
  breakabilityMass?: number | null,
) {
  renderWithIntl(
    <FeatureLoadoutTile
      loadout={{ ...loadout, ...overrides }}
      vehicleName="MOLE"
      laserSummary="3× Helix II"
      currentPatchVersion="4.7"
      viewerUserId={null}
      breakabilityMass={breakabilityMass}
    />,
    { locale: "en" },
  );
}

describe("FeatureLoadoutTile", () => {
  it("shows the featured label and links the name to the detail page", () => {
    renderTile();

    expect(screen.getByText("Top voted")).toBeVisible();
    const link = screen.getByRole("link", { name: "Quantainium MOLE" });
    expect(link).toHaveAttribute("href", "/loadouts/loadout-1");
    expect(screen.getByText(/^MOLE/)).toBeVisible();
    expect(screen.getByText("3× Helix II")).toBeVisible();
    expect(screen.getByText("12")).toBeVisible();
  });

  it("renders the description when present", () => {
    renderTile();
    expect(screen.getByText("Voll auf Instabilität optimiert.")).toBeVisible();
  });

  it("omits the description paragraph when absent", () => {
    renderTile({ description: undefined });
    expect(screen.queryByText("Voll auf Instabilität optimiert.")).toBeNull();
  });

  it("marks loadouts from older patches", () => {
    renderTile({ patchVersion: "4.5" });
    expect(screen.getByText("Patch 4.5")).toBeVisible();
  });

  it("shows the breakability stat when provided and hides it otherwise", () => {
    renderTile({}, 45230);
    expect(screen.getByText("cracks up to 45.2K mass")).toBeVisible();
  });

  it("hides the breakability stat when not computable", () => {
    renderTile({}, null);
    expect(screen.queryByText(/cracks up to/)).toBeNull();
  });
});
