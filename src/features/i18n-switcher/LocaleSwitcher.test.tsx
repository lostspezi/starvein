import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderWithIntl } from "@/test/render";
import { LocaleSwitcher } from "./LocaleSwitcher";

const { replaceMock } = vi.hoisted(() => ({ replaceMock: vi.fn() }));

vi.mock("@/i18n/navigation", () => ({
  usePathname: () => "/",
  useRouter: () => ({ replace: replaceMock }),
}));

beforeEach(() => {
  replaceMock.mockClear();
});

describe("LocaleSwitcher", () => {
  it("offers both locales", () => {
    renderWithIntl(<LocaleSwitcher />, { locale: "en" });
    expect(screen.getByRole("button", { name: "Deutsch" })).toBeVisible();
    expect(screen.getByRole("button", { name: "English" })).toBeVisible();
  });

  it("marks the active locale", () => {
    renderWithIntl(<LocaleSwitcher />, { locale: "en" });
    expect(screen.getByRole("button", { name: "English" })).toHaveAttribute(
      "aria-current",
      "true",
    );
    expect(screen.getByRole("button", { name: "Deutsch" })).not.toHaveAttribute(
      "aria-current",
    );
  });

  it("switches to the other locale on click", async () => {
    const user = userEvent.setup();
    renderWithIntl(<LocaleSwitcher />, { locale: "en" });

    await user.click(screen.getByRole("button", { name: "Deutsch" }));

    expect(replaceMock).toHaveBeenCalledWith("/", { locale: "de" });
  });
});
