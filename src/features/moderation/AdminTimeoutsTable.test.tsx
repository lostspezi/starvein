import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderWithIntl } from "@/test/render";
import { AdminTimeoutsTable } from "./AdminTimeoutsTable";
import type { ChatTimeout } from "./timeouts.repository";

const fetchMock = vi.fn();

const TIMEOUTS: ChatTimeout[] = [
  {
    userId: "user-1",
    userName: "Miner Joe",
    until: "2026-07-10T14:00:00.000Z",
    byUserId: "mod-1",
    createdAt: "2026-07-10T13:00:00.000Z",
  },
];

beforeEach(() => {
  fetchMock.mockReset();
  fetchMock.mockResolvedValue({
    ok: true,
    status: 204,
    json: async () => null,
  });
  vi.stubGlobal("fetch", fetchMock);
});

describe("AdminTimeoutsTable", () => {
  it("shows an empty state without active timeouts", () => {
    renderWithIntl(<AdminTimeoutsTable timeouts={[]} />, { locale: "en" });

    expect(screen.getByText("No active timeouts.")).toBeVisible();
  });

  it("lists active timeouts and revokes via DELETE", async () => {
    const user = userEvent.setup();
    renderWithIntl(<AdminTimeoutsTable timeouts={TIMEOUTS} />, {
      locale: "en",
    });

    expect(screen.getByText("Miner Joe")).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Revoke" }));

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/chat/timeouts/user-1",
      expect.objectContaining({ method: "DELETE" }),
    );
  });
});
