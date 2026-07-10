import { screen } from "@testing-library/react";
import { createElement, type ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderWithIntl } from "@/test/render";
import { NavLinks } from "./NavLinks";

const { pathnameMock } = vi.hoisted(() => ({
  pathnameMock: vi.fn<() => string>(() => "/"),
}));

vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children, ...props }: { href: string; children: ReactNode }) =>
    createElement("a", { href, ...props }, children),
  usePathname: () => pathnameMock(),
}));

beforeEach(() => {
  pathnameMock.mockReturnValue("/");
});

describe("NavLinks", () => {
  it("renders all four primary routes", () => {
    renderWithIntl(<NavLinks />, { locale: "en" });
    for (const name of ["Ores", "Locations", "Signatures", "Compare"]) {
      expect(screen.getByRole("link", { name })).toBeVisible();
    }
  });

  it("marks the active route with aria-current and cyan glow", () => {
    pathnameMock.mockReturnValue("/ores");
    renderWithIntl(<NavLinks />, { locale: "en" });

    const active = screen.getByRole("link", { name: "Ores" });
    expect(active).toHaveAttribute("aria-current", "page");
    expect(active).toHaveClass("text-accent-cyan");

    const inactive = screen.getByRole("link", { name: "Locations" });
    expect(inactive).not.toHaveAttribute("aria-current");
    expect(inactive).toHaveClass("text-text-muted");
  });

  it("keeps the section active on sub-routes", () => {
    pathnameMock.mockReturnValue("/locations/stanton/crusader");
    renderWithIntl(<NavLinks />, { locale: "en" });
    expect(screen.getByRole("link", { name: "Locations" })).toHaveAttribute(
      "aria-current",
      "page",
    );
  });

  it("marks no route active on the home page", () => {
    renderWithIntl(<NavLinks />, { locale: "en" });
    for (const name of ["Ores", "Locations", "Signatures", "Compare"]) {
      expect(screen.getByRole("link", { name })).not.toHaveAttribute(
        "aria-current",
      );
    }
  });
});
