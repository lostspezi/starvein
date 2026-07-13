import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderWithIntl } from "@/test/render";
import { OwnerActions } from "./OwnerActions";

const { pushMock, refreshMock } = vi.hoisted(() => ({
  pushMock: vi.fn(),
  refreshMock: vi.fn(),
}));

vi.mock("@/i18n/navigation", () => ({
  usePathname: () => "/",
  useRouter: () => ({ push: pushMock, refresh: refreshMock }),
  Link: ({
    href,
    children,
    ...props
  }: {
    href: string;
    children: React.ReactNode;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

const fetchMock = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal("fetch", fetchMock);
});

describe("OwnerActions", () => {
  it("links to the edit page", () => {
    renderWithIntl(<OwnerActions loadoutId="loadout-1" isPublic={false} />, {
      locale: "en",
    });
    expect(screen.getByRole("link", { name: /Edit/ })).toHaveAttribute(
      "href",
      "/loadouts/loadout-1/edit",
    );
  });

  it("toggles the visibility via PATCH", async () => {
    fetchMock.mockResolvedValue(new Response("{}", { status: 200 }));
    const user = userEvent.setup();
    renderWithIntl(<OwnerActions loadoutId="loadout-1" isPublic={false} />, {
      locale: "en",
    });

    await user.click(screen.getByRole("button", { name: "Publish" }));

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/loadouts/loadout-1",
      expect.objectContaining({ method: "PATCH" }),
    );
    expect(refreshMock).toHaveBeenCalled();
  });

  it("deletes only after confirmation", async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 204 }));
    const confirmSpy = vi
      .spyOn(window, "confirm")
      .mockReturnValueOnce(false)
      .mockReturnValueOnce(true);
    const user = userEvent.setup();
    renderWithIntl(<OwnerActions loadoutId="loadout-1" isPublic={true} />, {
      locale: "en",
    });

    const deleteButton = screen.getByRole("button", { name: "Delete" });
    await user.click(deleteButton);
    expect(fetchMock).not.toHaveBeenCalled();

    await user.click(deleteButton);
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/loadouts/loadout-1",
      expect.objectContaining({ method: "DELETE" }),
    );
    expect(pushMock).toHaveBeenCalledWith("/loadouts/mine");
    confirmSpy.mockRestore();
  });
});
