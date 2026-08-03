import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { renderWithIntl } from "@/test/render";
import type { ApiKeySummary } from "./api-keys.schema";
import { ApiKeysManager } from "./ApiKeysManager";

const existingKey: ApiKeySummary = {
  id: "abc123abc123abc123abc123",
  name: "Existing",
  start: "sv_abc12",
  createdAt: "2026-08-01T10:00:00.000Z",
  lastUsedAt: null,
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

describe("ApiKeysManager", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("shows an empty state without keys", () => {
    renderWithIntl(<ApiKeysManager initialKeys={[]} />);
    expect(screen.getByText(/no keys yet/i)).toBeInTheDocument();
  });

  it("lists existing keys with their start fragment", () => {
    renderWithIntl(<ApiKeysManager initialKeys={[existingKey]} />);
    expect(screen.getByText("Existing")).toBeInTheDocument();
    expect(screen.getByText(/sv_abc12/)).toBeInTheDocument();
  });

  it("creates a key and shows the full key once in a modal", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      jsonResponse(
        {
          id: "def456def456def456def456",
          name: "New Bot",
          start: "sv_new12",
          createdAt: "2026-08-03T12:00:00.000Z",
          lastUsedAt: null,
          key: "sv_new1234567890",
        },
        201,
      ),
    );

    renderWithIntl(<ApiKeysManager initialKeys={[]} />);
    await userEvent.type(screen.getByLabelText(/name/i), "New Bot");
    await userEvent.click(screen.getByRole("button", { name: /create key/i }));

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/account/api-keys",
      expect.objectContaining({ method: "POST" }),
    );
    expect(await screen.findByText("sv_new1234567890")).toBeInTheDocument();

    // Modal schließen → Key steht in der Liste, aber nur mit start-Fragment
    await userEvent.click(screen.getByRole("button", { name: /close/i }));
    expect(screen.queryByText("sv_new1234567890")).not.toBeInTheDocument();
    expect(screen.getByText("New Bot")).toBeInTheDocument();
    expect(screen.getByText(/sv_new12/)).toBeInTheDocument();
  });

  it("shows the limit message on 403", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      jsonResponse({ error: "key limit reached" }, 403),
    );

    renderWithIntl(<ApiKeysManager initialKeys={[]} />);
    await userEvent.type(screen.getByLabelText(/name/i), "Sixth");
    await userEvent.click(screen.getByRole("button", { name: /create key/i }));

    expect(await screen.findByText(/limit reached/i)).toBeInTheDocument();
  });

  it("revokes a key after confirmation", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(jsonResponse({ ok: true }));

    renderWithIntl(<ApiKeysManager initialKeys={[existingKey]} />);
    await userEvent.click(screen.getByRole("button", { name: /revoke/i }));
    // Bestätigungs-Schritt
    await userEvent.click(
      await screen.findByRole("button", { name: /revoke/i }),
    );

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        `/api/account/api-keys/${existingKey.id}`,
        expect.objectContaining({ method: "DELETE" }),
      );
    });
    await waitFor(() => {
      expect(screen.queryByText("Existing")).not.toBeInTheDocument();
    });
  });
});
