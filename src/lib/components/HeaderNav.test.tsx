import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createElement, type ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderWithIntl } from "@/test/render";
import { HeaderNav } from "./HeaderNav";

const { pathnameMock } = vi.hoisted(() => ({
  pathnameMock: vi.fn<() => string>(() => "/"),
}));

vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children, ...props }: { href: string; children: ReactNode }) =>
    createElement("a", { href, ...props }, children),
  usePathname: () => pathnameMock(),
}));

vi.mock("@/features/i18n-switcher/LocaleSwitcher", () => ({
  LocaleSwitcher: () =>
    createElement("button", { type: "button" }, "locale-switcher"),
}));

beforeEach(() => {
  pathnameMock.mockReturnValue("/");
});

describe("HeaderNav", () => {
  it("renders a collapsed toggle and a hidden nav on mobile by default", () => {
    renderWithIntl(<HeaderNav />, { locale: "en" });

    const toggle = screen.getByRole("button", { name: "Navigation" });
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(toggle).toHaveClass("sm:hidden");

    const nav = screen.getByRole("navigation");
    expect(nav).toHaveClass("hidden", "sm:flex");
    expect(toggle).toHaveAttribute("aria-controls", nav.id);
  });

  it("wraps as its own full-width row on tablet and inlines only from lg", () => {
    // 10 Nav-Einträge passen bei 768px nicht mehr neben Wortmarke + Suche in
    // eine Zeile (CI-Fontmetriken: ~25px Overflow) — ab sm eigene, umbruch-
    // fähige Zeile, erst ab lg wieder inline im Header.
    renderWithIntl(<HeaderNav />, { locale: "en" });

    const nav = screen.getByRole("navigation");
    expect(nav).toHaveClass("sm:order-5", "sm:w-full", "sm:flex-wrap");
    expect(nav).toHaveClass("lg:order-2", "lg:w-auto", "lg:flex-nowrap");
  });

  it("expands the nav when the toggle is clicked", async () => {
    const user = userEvent.setup();
    renderWithIntl(<HeaderNav />, { locale: "en" });

    await user.click(screen.getByRole("button", { name: "Navigation" }));

    expect(screen.getByRole("button", { name: "Navigation" })).toHaveAttribute(
      "aria-expanded",
      "true",
    );
    const nav = screen.getByRole("navigation");
    expect(nav).toHaveClass("flex");
    expect(nav).not.toHaveClass("hidden");
    expect(screen.getByRole("link", { name: "Ores" })).toHaveAttribute(
      "href",
      "/ores",
    );
  });

  it("collapses again when a nav link is clicked", async () => {
    const user = userEvent.setup();
    renderWithIntl(<HeaderNav />, { locale: "en" });

    await user.click(screen.getByRole("button", { name: "Navigation" }));
    await user.click(screen.getByRole("link", { name: "Ores" }));

    expect(screen.getByRole("button", { name: "Navigation" })).toHaveAttribute(
      "aria-expanded",
      "false",
    );
    expect(screen.getByRole("navigation")).toHaveClass("hidden");
  });

  it("collapses on Escape and restores focus to the toggle", async () => {
    const user = userEvent.setup();
    renderWithIntl(<HeaderNav />, { locale: "en" });

    const toggle = screen.getByRole("button", { name: "Navigation" });
    await user.click(toggle);
    await user.keyboard("{Escape}");

    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(screen.getByRole("navigation")).toHaveClass("hidden");
    expect(toggle).toHaveFocus();
  });

  it("shows the locale switcher inside the panel for mobile only", async () => {
    const user = userEvent.setup();
    renderWithIntl(<HeaderNav />, { locale: "en" });

    await user.click(screen.getByRole("button", { name: "Navigation" }));

    const localeSwitcher = screen.getByRole("button", {
      name: "locale-switcher",
    });
    expect(localeSwitcher.parentElement).toHaveClass("sm:hidden");
  });

  it("collapses after switching the locale", async () => {
    const user = userEvent.setup();
    renderWithIntl(<HeaderNav />, { locale: "en" });

    await user.click(screen.getByRole("button", { name: "Navigation" }));
    await user.click(screen.getByRole("button", { name: "locale-switcher" }));

    expect(screen.getByRole("button", { name: "Navigation" })).toHaveAttribute(
      "aria-expanded",
      "false",
    );
  });

  it("collapses when focus leaves the nav", async () => {
    const user = userEvent.setup();
    renderWithIntl(
      <>
        <HeaderNav />
        <button type="button">outside</button>
      </>,
      { locale: "en" },
    );

    await user.click(screen.getByRole("button", { name: "Navigation" }));
    await user.click(screen.getByRole("button", { name: "outside" }));

    expect(screen.getByRole("button", { name: "Navigation" })).toHaveAttribute(
      "aria-expanded",
      "false",
    );
    expect(screen.getByRole("navigation")).toHaveClass("hidden");
  });
});
