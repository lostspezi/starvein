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

  describe("compact variant", () => {
    it("shows short labels but keeps the full accessible names", () => {
      renderWithIntl(<LocaleSwitcher variant="compact" />, { locale: "en" });

      const german = screen.getByRole("button", { name: "Deutsch" });
      const english = screen.getByRole("button", { name: "English" });
      expect(german).toHaveTextContent("DE");
      expect(english).toHaveTextContent("EN");
    });

    it("marks the active locale with aria-current and the cyan state", () => {
      renderWithIntl(<LocaleSwitcher variant="compact" />, { locale: "en" });

      const active = screen.getByRole("button", { name: "English" });
      expect(active).toHaveAttribute("aria-current", "true");
      expect(active).toHaveClass("text-accent-cyan");
      expect(screen.getByRole("button", { name: "Deutsch" })).toHaveClass(
        "text-text-muted",
      );
    });

    it("switches to the other locale on click", async () => {
      const user = userEvent.setup();
      renderWithIntl(<LocaleSwitcher variant="compact" />, { locale: "en" });

      await user.click(screen.getByRole("button", { name: "Deutsch" }));

      expect(replaceMock).toHaveBeenCalledWith("/", { locale: "de" });
    });
  });
});
