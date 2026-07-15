import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { renderWithIntl } from "@/test/render";
import { COMPANION_RELEASES_URL } from "@/lib/site-config";
import { CompanionGuide } from "./CompanionGuide";

describe("CompanionGuide", () => {
  it("shows the current release version in the badge", () => {
    renderWithIntl(<CompanionGuide version="0.4.2" />);
    expect(screen.getByText("Beta 0.4.2")).toBeVisible();
  });

  it("links the download button to the direct download endpoint", () => {
    renderWithIntl(<CompanionGuide version="0.1.1" />);
    const link = screen.getByRole("link", {
      name: /Download for Windows/i,
    });
    expect(link).toHaveAttribute("href", "/api/companion/download");
  });

  it("offers the MSI installer and the release archive as alternatives", () => {
    renderWithIntl(<CompanionGuide version="0.1.1" />);
    expect(
      screen.getByRole("link", { name: /MSI installer/i }),
    ).toHaveAttribute("href", "/api/companion/download?installer=msi");
    expect(
      screen.getByRole("link", { name: /All releases on GitHub/i }),
    ).toHaveAttribute("href", COMPANION_RELEASES_URL);
  });

  it("walks through all four steps", () => {
    renderWithIntl(<CompanionGuide version="0.1.1" />);
    expect(screen.getByText("Connect with Discord")).toBeVisible();
    expect(screen.getByText("Press the hotkey at the terminal")).toBeVisible();
    expect(screen.getByText("Review and confirm")).toBeVisible();
    expect(screen.getByText("Track jobs and get notified")).toBeVisible();
  });

  it("mentions the anti-cheat safety boundary", () => {
    renderWithIntl(<CompanionGuide version="0.1.1" />);
    expect(screen.getByText(/never reads game memory/i)).toBeVisible();
  });

  it("renders in German", () => {
    renderWithIntl(<CompanionGuide version="0.1.1" />, { locale: "de" });
    expect(screen.getByText("Mit Discord verbinden")).toBeVisible();
    expect(screen.getByText(/liest niemals den Spielspeicher/i)).toBeVisible();
  });
});
