import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderWithIntl } from "@/test/render";
import { SearchBox } from "./SearchBox";

const { pushMock } = vi.hoisted(() => ({ pushMock: vi.fn() }));

vi.mock("@/i18n/navigation", () => ({
  usePathname: () => "/",
  useRouter: () => ({ push: pushMock, replace: vi.fn() }),
}));

const yelaResult = {
  kind: "body",
  label: "Yela",
  detail: "moon",
  href: "/locations/stanton/yela",
};

beforeEach(() => {
  pushMock.mockClear();
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => ({
      ok: true,
      json: async () => [yelaResult],
    })),
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("SearchBox", () => {
  it("shows results with localized detail after typing", async () => {
    const user = userEvent.setup();
    renderWithIntl(<SearchBox debounceMs={0} />, { locale: "en" });

    await user.type(screen.getByRole("combobox"), "yel");

    const option = await screen.findByRole("option", { name: /Yela/ });
    expect(option).toBeVisible();
    expect(option).toHaveTextContent("Moon");
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/search?q=yel"),
      expect.anything(),
    );
  });

  it("navigates to the selected result via keyboard", async () => {
    const user = userEvent.setup();
    renderWithIntl(<SearchBox debounceMs={0} />, { locale: "en" });

    await user.type(screen.getByRole("combobox"), "yel");
    await screen.findByRole("option", { name: /Yela/ });

    await user.keyboard("{ArrowDown}{Enter}");

    expect(pushMock).toHaveBeenCalledWith("/locations/stanton/yela");
  });

  it("navigates on click", async () => {
    const user = userEvent.setup();
    renderWithIntl(<SearchBox debounceMs={0} />, { locale: "en" });

    await user.type(screen.getByRole("combobox"), "yel");
    await user.click(await screen.findByRole("option", { name: /Yela/ }));

    expect(pushMock).toHaveBeenCalledWith("/locations/stanton/yela");
  });

  it("closes the list on Escape", async () => {
    const user = userEvent.setup();
    renderWithIntl(<SearchBox debounceMs={0} />, { locale: "en" });

    await user.type(screen.getByRole("combobox"), "yel");
    await screen.findByRole("option", { name: /Yela/ });

    await user.keyboard("{Escape}");

    await waitFor(() => {
      expect(screen.queryByRole("option")).not.toBeInTheDocument();
    });
  });

  it("does not search below two characters", async () => {
    const user = userEvent.setup();
    renderWithIntl(<SearchBox debounceMs={0} />, { locale: "en" });

    await user.type(screen.getByRole("combobox"), "y");

    expect(fetch).not.toHaveBeenCalled();
  });
});
