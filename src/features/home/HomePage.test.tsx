import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { renderWithIntl } from "@/test/render";
import { HomePage } from "./HomePage";

describe("HomePage", () => {
  it("shows the app title with a descriptive tagline as heading", () => {
    renderWithIntl(<HomePage />, { locale: "en" });
    expect(
      screen.getByRole("heading", {
        level: 1,
        name: "STARVEIN Star Citizen Mining Reference",
      }),
    ).toBeVisible();
  });

  it("shows the localized welcome text", () => {
    renderWithIntl(<HomePage />, { locale: "de" });
    expect(
      screen.getByText(
        /Willkommen bei STARVEIN, deiner freien Mining-Referenz/,
      ),
    ).toBeVisible();
    expect(
      screen.getByText(/Gebaut von der Community, für die Community\./),
    ).toBeVisible();
  });

  it("is left-aligned instead of a centered hero column", () => {
    renderWithIntl(<HomePage />, { locale: "en" });
    const section = screen
      .getByRole("heading", { level: 1 })
      .closest("section");
    expect(section?.className).not.toContain("items-center");
    expect(section?.className).not.toContain("text-center");
  });

  it("renders the hero search with its own accessible name", () => {
    renderWithIntl(<HomePage />, { locale: "en" });
    expect(
      screen.getByRole("combobox", {
        name: "Find ores, locations, blueprints and signatures",
      }),
    ).toBeVisible();
  });

  it("staggers the hero reveal animation", () => {
    renderWithIntl(<HomePage />, { locale: "en" });
    const heading = screen.getByRole("heading", { level: 1 });
    expect(heading).toHaveClass("animate-reveal");
  });
});
