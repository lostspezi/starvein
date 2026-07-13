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
  it("renders brand, primary nav, search and locale switcher", () => {
    renderWithIntl(<Header />, { locale: "en" });

    expect(screen.getByRole("link", { name: "STARVEIN" })).toBeVisible();
    for (const name of ["Ores", "Locations", "Signatures", "Compare"]) {
      expect(screen.getByRole("link", { name })).toBeVisible();
    }
    expect(screen.getByRole("combobox", { name: "Search" })).toBeVisible();
    // Zwei Instanzen: Burger-Panel (mobil) + rechter Cluster (Desktop) —
    // pro Breakpoint ist per CSS nur eine sichtbar.
    expect(screen.getAllByRole("button", { name: "English" })).toHaveLength(2);
    expect(screen.getByTestId("user-menu")).toBeInTheDocument();
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
