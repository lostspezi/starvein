import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Ore } from "@/features/ores/ores.schema";
import { renderWithIntl } from "@/test/render";
import { SubmissionsPanel } from "./SubmissionsPanel";
import type { Submission } from "./submissions.schema";

const hada: Ore = {
  code: "HADA",
  name_de: "Hadanite",
  name_en: "Hadanite",
  rarityTier: "epic",
  mineableBy: { ship: false, roc: true, fps: true },
};

const pending: Submission = {
  id: "sub-1",
  targetType: "oreOccurrence",
  targetKey: null,
  proposedChange: {
    oreCode: "HADA",
    systemCode: "STANTON",
    bodySlug: "daymar",
    method: "fps",
    patchVersion: "4.7",
    probabilityPercent: 42,
  },
  submittedBy: "u1",
  createdAt: "2026-07-09T10:00:00.000Z",
  votes: { up: 2, down: 1 },
  voters: [],
  confidenceScore: 0.3,
  status: "pending",
};

beforeEach(() => {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => ({ ok: true, json: async () => [] })),
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
});

function renderPanel(isAuthenticated: boolean) {
  renderWithIntl(
    <SubmissionsPanel
      systemCode="STANTON"
      bodySlug="daymar"
      initialSubmissions={[pending]}
      ores={[hada]}
      isAuthenticated={isAuthenticated}
    />,
    { locale: "en" },
  );
}

describe("SubmissionsPanel", () => {
  it("lists pending proposals with badge and vote counts", () => {
    renderPanel(false);

    expect(screen.getByText(/HADA/)).toBeVisible();
    expect(screen.getByText("42%")).toBeVisible();
    expect(screen.getByText("New")).toBeVisible();
    expect(screen.getByText("2 for · 1 against")).toBeVisible();
  });

  it("hides voting and form for anonymous users but shows a login hint", () => {
    renderPanel(false);

    expect(
      screen.queryByRole("button", { name: "Vote up" }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByText("Sign in to submit proposals and vote."),
    ).toBeVisible();
  });

  it("sends votes for signed-in users", async () => {
    const user = userEvent.setup();
    renderPanel(true);

    await user.click(screen.getByRole("button", { name: "Vote up" }));

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        "/api/submissions/vote",
        expect.objectContaining({ method: "POST" }),
      );
    });
  });

  it("submits a new proposal", async () => {
    const user = userEvent.setup();
    renderPanel(true);

    await user.selectOptions(screen.getByLabelText("Ore"), "HADA");
    await user.selectOptions(screen.getByLabelText("Method"), "fps");
    const probability = screen.getByLabelText("Probability (%)");
    await user.clear(probability);
    await user.type(probability, "55");
    await user.click(screen.getByRole("button", { name: "Submit" }));

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        "/api/submissions",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({
            oreCode: "HADA",
            systemCode: "STANTON",
            bodySlug: "daymar",
            method: "fps",
            probabilityPercent: 55,
          }),
        }),
      );
    });
  });
});
