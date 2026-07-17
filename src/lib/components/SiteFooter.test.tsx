import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { AppLocale } from "@/i18n/messages";
import {
  GITHUB_BUG_URL,
  GITHUB_FEATURE_URL,
  GITHUB_REPO_URL,
  TWITCH_URL,
} from "@/lib/site-config";
import { FAN_DISCLAIMER_TEXT, RSI_URL } from "@/test/factories";
import { renderWithIntl } from "@/test/render";
import { SiteFooter } from "./SiteFooter";

describe.each<AppLocale>(["de", "en"])("SiteFooter (%s)", (locale) => {
  it("shows the verbatim policy disclaimer", () => {
    renderWithIntl(<SiteFooter />, { locale });
    expect(screen.getByText(FAN_DISCLAIMER_TEXT)).toBeVisible();
  });

  it("links visibly to the official RSI website", () => {
    renderWithIntl(<SiteFooter />, { locale });
    const links = screen.getAllByRole("link");
    const rsiLink = links.find((link) => link.getAttribute("href") === RSI_URL);
    expect(rsiLink).toBeVisible();
  });

  it("links to the GitHub repository, bug report and feature request", () => {
    renderWithIntl(<SiteFooter />, { locale });
    const hrefs = screen
      .getAllByRole("link")
      .map((link) => link.getAttribute("href"));
    expect(hrefs).toContain(GITHUB_REPO_URL);
    expect(hrefs).toContain(GITHUB_BUG_URL);
    expect(hrefs).toContain(GITHUB_FEATURE_URL);
  });

  it("links internally to the core reference sections", () => {
    renderWithIntl(<SiteFooter />, { locale });
    const hrefs = screen
      .getAllByRole("link")
      .map((link) => link.getAttribute("href"));
    for (const path of [
      "/ores",
      "/locations",
      "/occurrences",
      "/signatures",
      "/blueprints",
      "/guides",
    ]) {
      expect(hrefs).toContain(path);
    }
  });

  it("shows the Made by the Community logo next to the disclaimer", () => {
    renderWithIntl(<SiteFooter />, { locale });
    const logo = screen.getByRole("img", { name: /Made by the Community/i });
    expect(logo).toBeVisible();
    expect(logo).toHaveAttribute(
      "src",
      expect.stringContaining("made-by-the-community"),
    );
  });

  it("credits lostspezi with a link to the Twitch channel", () => {
    renderWithIntl(<SiteFooter />, { locale });
    const twitchLink = screen.getByRole("link", { name: "lostspezi" });
    expect(twitchLink).toBeVisible();
    expect(twitchLink).toHaveAttribute("href", TWITCH_URL);
    expect(screen.getByText(/Crafted with ♥ by/)).toBeVisible();
  });

  it("opens external project links in a new tab with rel protection", () => {
    renderWithIntl(<SiteFooter />, { locale });
    for (const href of [GITHUB_REPO_URL, TWITCH_URL]) {
      const link = screen
        .getAllByRole("link")
        .find((candidate) => candidate.getAttribute("href") === href);
      expect(link).toHaveAttribute("target", "_blank");
      expect(link).toHaveAttribute("rel", "noopener noreferrer");
    }
  });
});
