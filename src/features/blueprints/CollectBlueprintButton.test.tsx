import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderWithIntl } from "@/test/render";
import { CollectBlueprintButton } from "./CollectBlueprintButton";

const { useSessionMock } = vi.hoisted(() => ({
  useSessionMock: vi.fn(),
}));

vi.mock("@/lib/auth-client", () => ({
  useSession: useSessionMock,
}));

beforeEach(() => {
  useSessionMock.mockReturnValue({ data: null, isPending: false });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

function stubFetch(ok = true) {
  const fetchMock = vi.fn().mockResolvedValue({ ok });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

describe("CollectBlueprintButton", () => {
  it("renders nothing for anonymous users", () => {
    const { container } = renderWithIntl(
      <CollectBlueprintButton
        blueprintKey="BP_CRAFT_AMRS_LaserCannon_S1"
        initialIsCollected={false}
        isAuthenticated={false}
      />,
      { locale: "en" },
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("POSTs to collect an uncollected blueprint", async () => {
    const fetchMock = stubFetch();
    renderWithIntl(
      <CollectBlueprintButton
        blueprintKey="BP_CRAFT_AMRS_LaserCannon_S1"
        initialIsCollected={false}
        isAuthenticated
      />,
      { locale: "en" },
    );

    await userEvent.click(
      screen.getByRole("button", { name: "Mark blueprint as collected" }),
    );

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/blueprint-collection",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ blueprintKey: "BP_CRAFT_AMRS_LaserCannon_S1" }),
      }),
    );
    expect(
      screen.getByRole("button", { name: "Remove blueprint from collection" }),
    ).toHaveAttribute("aria-pressed", "true");
  });

  it("DELETEs to uncollect a collected blueprint", async () => {
    const fetchMock = stubFetch();
    renderWithIntl(
      <CollectBlueprintButton
        blueprintKey="BP_CRAFT_AMRS_LaserCannon_S1"
        initialIsCollected
        isAuthenticated
      />,
      { locale: "en" },
    );

    await userEvent.click(
      screen.getByRole("button", { name: "Remove blueprint from collection" }),
    );

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/blueprint-collection",
      expect.objectContaining({ method: "DELETE" }),
    );
  });

  it("self-managed: renders nothing without a client session", () => {
    stubFetch();
    const { container } = renderWithIntl(
      <CollectBlueprintButton blueprintKey="BP_CRAFT_AMRS_LaserCannon_S1" />,
      { locale: "en" },
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("self-managed: loads the collected state for signed-in users", async () => {
    useSessionMock.mockReturnValue({
      data: { user: { id: "user-1" } },
      isPending: false,
    });
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        json: async () => [{ blueprintKey: "BP_CRAFT_AMRS_LaserCannon_S1" }],
      })),
    );

    renderWithIntl(
      <CollectBlueprintButton blueprintKey="BP_CRAFT_AMRS_LaserCannon_S1" />,
      { locale: "en" },
    );

    expect(
      await screen.findByRole("button", {
        name: "Remove blueprint from collection",
      }),
    ).toHaveAttribute("aria-pressed", "true");
    expect(fetch).toHaveBeenCalledWith("/api/blueprint-collection");
  });

  it("keeps the previous state when the request fails", async () => {
    stubFetch(false);
    renderWithIntl(
      <CollectBlueprintButton
        blueprintKey="BP_CRAFT_AMRS_LaserCannon_S1"
        initialIsCollected={false}
        isAuthenticated
      />,
      { locale: "en" },
    );

    await userEvent.click(
      screen.getByRole("button", { name: "Mark blueprint as collected" }),
    );

    expect(
      screen.getByRole("button", { name: "Mark blueprint as collected" }),
    ).toHaveAttribute("aria-pressed", "false");
  });
});
