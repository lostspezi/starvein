import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { renderWithIntl } from "@/test/render";
import type { AdminApiKeyEntry } from "./admin-api-keys.service";
import { AdminApiKeysTable } from "./AdminApiKeysTable";

const entry: AdminApiKeyEntry = {
  id: "abc123abc123abc123abc123",
  name: "Discord Bot",
  start: "sv_abc12",
  createdAt: "2026-08-01T10:00:00.000Z",
  lastUsedAt: "2026-08-03T09:00:00.000Z",
  totalRequests: 1234,
  owner: { id: "def456def456def456def456", name: "MinerOne", banned: false },
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

describe("AdminApiKeysTable", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("lists keys with owner and request totals, no key material", () => {
    renderWithIntl(<AdminApiKeysTable initialEntries={[entry]} />);
    expect(screen.getByText("Discord Bot")).toBeInTheDocument();
    expect(screen.getByText("MinerOne")).toBeInTheDocument();
    expect(screen.getByText(/sv_abc12/)).toBeInTheDocument();
    expect(screen.getByText("1,234")).toBeInTheDocument();
  });

  it("deletes a key after confirmation", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(jsonResponse({ ok: true }));

    renderWithIntl(<AdminApiKeysTable initialEntries={[entry]} />);
    await userEvent.click(screen.getByRole("button", { name: /delete/i }));
    await userEvent.click(
      await screen.findByRole("button", { name: /confirm delete/i }),
    );

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        `/api/admin/api-keys/${entry.id}`,
        expect.objectContaining({ method: "DELETE" }),
      );
    });
    await waitFor(() => {
      expect(screen.queryByText("Discord Bot")).not.toBeInTheDocument();
    });
  });

  it("toggles the creation ban for the owner", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(jsonResponse({ id: entry.owner.id, banned: true }));

    renderWithIntl(<AdminApiKeysTable initialEntries={[entry]} />);
    await userEvent.click(
      screen.getByRole("button", { name: /ban from creating/i }),
    );

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        `/api/admin/users/${entry.owner.id}/api-key-ban`,
        expect.objectContaining({ method: "PATCH" }),
      );
    });
    expect(
      await screen.findByRole("button", { name: /lift creation ban/i }),
    ).toBeInTheDocument();
  });
});
