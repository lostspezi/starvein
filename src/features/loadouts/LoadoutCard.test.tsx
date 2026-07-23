import { screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderWithIntl } from "@/test/render";
import { LoadoutCard } from "./LoadoutCard";
import type { Loadout } from "./loadouts.schema";

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
  method: "ship",
  vehicleCode: "mole",
  hardpoints: [{ hardpointIndex: 0, laserCode: "helix-ii", moduleCodes: [] }],
  gadgetCodes: [],
  ownerUserId: "user-1",
  isPublic: true,
  votes: { up: 5 },
  voters: [],
  patchVersion: "4.7",
  createdAt: "2026-07-13T08:00:00.000Z",
  updatedAt: "2026-07-13T08:00:00.000Z",
};

function renderCard(
  overrides: Partial<Loadout> = {},
  breakabilityMass?: number | null,
) {
  renderWithIntl(
    <LoadoutCard
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

describe("LoadoutCard", () => {
  it("links the name to the detail page and shows vehicle info", () => {
    renderCard();

    const link = screen.getByRole("link", { name: "Quantainium MOLE" });
    expect(link).toHaveAttribute("href", "/loadouts/loadout-1");
    expect(screen.getByText(/^MOLE/)).toBeVisible();
    expect(screen.getByText("3× Helix II")).toBeVisible();
    expect(screen.getByText("5")).toBeVisible();
  });

  it("marks loadouts from older patches", () => {
    renderCard({ patchVersion: "4.5" });
    expect(screen.getByText("Patch 4.5")).toBeVisible();
  });

  it("shows no patch badge for current loadouts", () => {
    renderCard();
    expect(screen.queryByText(/^Patch /)).toBeNull();
  });

  it("shows the compact breakability stat when provided", () => {
    renderCard({}, 45230);
    expect(screen.getByText("cracks up to 45.2K mass")).toBeVisible();
  });

  it("shows no breakability stat when missing or not computable", () => {
    renderCard();
    expect(screen.queryByText(/cracks up to/)).toBeNull();
    renderCard({ id: "loadout-2" }, null);
    expect(screen.queryByText(/cracks up to/)).toBeNull();
  });
});
