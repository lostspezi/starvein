import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { renderWithIntl } from "@/test/render";
import { Header } from "./Header";

vi.mock("@/features/auth/UserMenu", () => ({
  UserMenu: () => <div data-testid="user-menu" />,
}));
vi.mock("@/features/search/SearchBox", () => ({
  SearchBox: () => (
    <input
      role="combobox"
      aria-label="Search"
      aria-expanded={false}
      aria-controls="search-results"
    />
  ),
}));

describe("Header", () => {
  it("renders brand, grouped primary nav, search and locale switcher", () => {
    renderWithIntl(<Header />, { locale: "en" });

    expect(screen.getByRole("link", { name: "STARVEIN" })).toBeVisible();
    for (const name of ["Locations", "Guides", "Companion"]) {
      expect(screen.getByRole("link", { name })).toBeVisible();
    }
    for (const name of ["Mining", "Crafting", "Fleet"]) {
      expect(screen.getByRole("button", { name })).toBeInTheDocument();
    }
    // Gruppen-Kinder existieren genau einmal im DOM (Drawer-Sektion und
    // Dropdown-Panel sind dasselbe Element, per CSS umgeschaltet).
    expect(screen.getByRole("link", { name: "Ores" })).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "Search" })).toBeVisible();
    // Zwei Instanzen: Burger-Panel (mobil, full) + rechter Cluster (Desktop,
    // compact mit aria-label) — pro Breakpoint ist per CSS nur eine sichtbar.
    expect(screen.getAllByRole("button", { name: "English" })).toHaveLength(2);
    expect(screen.getByTestId("user-menu")).toBeInTheDocument();
  });

  it("centers the header content for very wide screens", () => {
    renderWithIntl(<Header />, { locale: "en" });

    const container = screen.getByRole("banner").firstElementChild;
    expect(container).toHaveClass("mx-auto", "max-w-[90rem]");
  });

  it("scales brand and search up for large screens", () => {
    renderWithIntl(<Header />, { locale: "en" });

    expect(screen.getByRole("link", { name: "STARVEIN" })).toHaveClass(
      "lg:text-base",
    );
    const searchWrapper = screen.getByRole("combobox", {
      name: "Search",
    }).parentElement;
    expect(searchWrapper).toHaveClass("sm:w-64", "xl:w-72", "2xl:w-80");
  });

  it("is a sticky glass HUD bar", () => {
    renderWithIntl(<Header />, { locale: "en" });
    const header = screen.getByRole("banner");
    expect(header).toHaveClass(
      "sticky",
      "top-0",
      "z-40",
      "bg-glass",
      "backdrop-blur-md",
      "border-glass-border",
    );
  });
});
