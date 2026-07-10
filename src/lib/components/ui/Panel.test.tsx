import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Panel, panelClasses } from "./Panel";

describe("Panel", () => {
  it("renders children in a solid card shell by default", () => {
    render(<Panel>content</Panel>);
    const panel = screen.getByText("content");
    expect(panel).toHaveClass(
      "rounded-lg",
      "border",
      "border-bg-nebula-2",
      "bg-bg-nebula",
    );
  });

  it("renders a glass variant with blur", () => {
    render(<Panel variant="glass">glassy</Panel>);
    expect(screen.getByText("glassy")).toHaveClass(
      "border-glass-border",
      "bg-glass",
      "backdrop-blur-md",
    );
  });

  it("adds a glow lift on hover when requested", () => {
    render(<Panel hover>lifting</Panel>);
    expect(screen.getByText("lifting")).toHaveClass(
      "transition-all",
      "hover:-translate-y-0.5",
      "hover:border-accent-cyan",
      "hover:shadow-glow-sm",
    );
  });

  it("merges a custom className, custom utilities win", () => {
    render(<Panel className="p-4 bg-bg-void">custom</Panel>);
    const panel = screen.getByText("custom");
    expect(panel).toHaveClass("p-4", "bg-bg-void");
    expect(panel).not.toHaveClass("bg-bg-nebula");
  });
});

describe("panelClasses", () => {
  it("returns the same shell classes for link cards", () => {
    expect(panelClasses()).toContain("rounded-lg");
    expect(panelClasses({ variant: "glass" })).toContain("bg-glass");
    expect(panelClasses({ hover: true })).toContain("hover:shadow-glow-sm");
  });
});
