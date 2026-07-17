import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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

/** Panel eines Gruppen-Triggers über dessen aria-controls auflösen. */
function getPanel(trigger: HTMLElement): HTMLElement {
  const id = trigger.getAttribute("aria-controls");
  expect(id).toBeTruthy();
  const panel = document.getElementById(id as string);
  expect(panel).not.toBeNull();
  return panel as HTMLElement;
}

describe("NavLinks", () => {
  it("renders three direct links and three closed group triggers", () => {
    renderWithIntl(<NavLinks />, { locale: "en" });

    for (const name of ["Locations", "Guides", "Companion"]) {
      expect(screen.getByRole("link", { name })).toBeVisible();
    }
    for (const name of ["Mining", "Crafting", "Fleet"]) {
      const trigger = screen.getByRole("button", { name });
      expect(trigger).toHaveAttribute("aria-expanded", "false");
      expect(getPanel(trigger)).toHaveClass("sm:hidden");
    }
  });

  it("opens the mining panel with its reference routes on click", async () => {
    const user = userEvent.setup();
    renderWithIntl(<NavLinks />, { locale: "en" });

    const trigger = screen.getByRole("button", { name: "Mining" });
    await user.click(trigger);

    expect(trigger).toHaveAttribute("aria-expanded", "true");
    const panel = getPanel(trigger);
    expect(panel).toHaveClass("sm:flex", "sm:animate-reveal");
    expect(panel).not.toHaveClass("sm:hidden");
    for (const [name, href] of [
      ["Ores", "/ores"],
      ["Occurrences", "/occurrences"],
      ["Signatures", "/signatures"],
      ["Compare", "/compare"],
    ] as const) {
      expect(screen.getByRole("link", { name })).toHaveAttribute("href", href);
    }
  });

  it("closes an open group when another one is opened", async () => {
    const user = userEvent.setup();
    renderWithIntl(<NavLinks />, { locale: "en" });

    await user.click(screen.getByRole("button", { name: "Mining" }));
    await user.click(screen.getByRole("button", { name: "Crafting" }));

    expect(screen.getByRole("button", { name: "Mining" })).toHaveAttribute(
      "aria-expanded",
      "false",
    );
    expect(screen.getByRole("button", { name: "Crafting" })).toHaveAttribute(
      "aria-expanded",
      "true",
    );
  });

  it("closes on Escape and restores focus to the trigger", async () => {
    const user = userEvent.setup();
    renderWithIntl(<NavLinks />, { locale: "en" });

    const trigger = screen.getByRole("button", { name: "Mining" });
    await user.click(trigger);
    await user.keyboard("{Escape}");

    expect(trigger).toHaveAttribute("aria-expanded", "false");
    expect(trigger).toHaveFocus();
  });

  it("closes when focus leaves the dropdown", async () => {
    const user = userEvent.setup();
    renderWithIntl(
      <>
        <NavLinks />
        <button type="button">outside</button>
      </>,
      { locale: "en" },
    );

    await user.click(screen.getByRole("button", { name: "Mining" }));
    await user.click(screen.getByRole("button", { name: "outside" }));

    expect(screen.getByRole("button", { name: "Mining" })).toHaveAttribute(
      "aria-expanded",
      "false",
    );
  });

  it("closes the panel and notifies onNavigate when a child link is clicked", async () => {
    const user = userEvent.setup();
    const onNavigate = vi.fn();
    renderWithIntl(<NavLinks onNavigate={onNavigate} />, { locale: "en" });

    const trigger = screen.getByRole("button", { name: "Mining" });
    await user.click(trigger);
    await user.click(screen.getByRole("link", { name: "Ores" }));

    expect(trigger).toHaveAttribute("aria-expanded", "false");
    expect(onNavigate).toHaveBeenCalledOnce();
  });

  it("notifies onNavigate for direct links", async () => {
    const user = userEvent.setup();
    const onNavigate = vi.fn();
    renderWithIntl(<NavLinks onNavigate={onNavigate} />, { locale: "en" });

    await user.click(screen.getByRole("link", { name: "Locations" }));

    expect(onNavigate).toHaveBeenCalledOnce();
  });

  it("marks the active child and its group trigger with the cyan state", () => {
    pathnameMock.mockReturnValue("/signatures");
    renderWithIntl(<NavLinks />, { locale: "en" });

    const child = screen.getByRole("link", { name: "Signatures" });
    expect(child).toHaveAttribute("aria-current", "page");
    expect(child).toHaveClass("text-accent-cyan");

    expect(screen.getByRole("button", { name: "Mining" })).toHaveClass(
      "text-accent-cyan",
    );
    for (const name of ["Crafting", "Fleet"]) {
      expect(screen.getByRole("button", { name })).toHaveClass(
        "text-text-muted",
      );
    }
  });

  it("keeps the group trigger active on sub-routes", () => {
    pathnameMock.mockReturnValue("/ores/hada");
    renderWithIntl(<NavLinks />, { locale: "en" });

    expect(screen.getByRole("button", { name: "Mining" })).toHaveClass(
      "text-accent-cyan",
    );
  });

  it("marks the active direct link with aria-current and cyan glow", () => {
    pathnameMock.mockReturnValue("/locations/stanton/crusader");
    renderWithIntl(<NavLinks />, { locale: "en" });

    const active = screen.getByRole("link", { name: "Locations" });
    expect(active).toHaveAttribute("aria-current", "page");
    expect(active).toHaveClass("text-accent-cyan");
  });

  it("marks nothing active on the home page", () => {
    renderWithIntl(<NavLinks />, { locale: "en" });

    for (const name of ["Locations", "Guides", "Companion"]) {
      expect(screen.getByRole("link", { name })).not.toHaveAttribute(
        "aria-current",
      );
    }
    for (const name of ["Mining", "Crafting", "Fleet"]) {
      expect(screen.getByRole("button", { name })).toHaveClass(
        "text-text-muted",
      );
    }
  });

  it("renders German group and child labels", async () => {
    const user = userEvent.setup();
    renderWithIntl(<NavLinks />, { locale: "de" });

    await user.click(screen.getByRole("button", { name: "Flotte" }));

    expect(screen.getByRole("link", { name: "Schiffe" })).toHaveAttribute(
      "href",
      "/ships",
    );
  });
});
