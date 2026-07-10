import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { GlowLink } from "./GlowLink";

describe("GlowLink", () => {
  it("renders a locale-aware link with glow hover styling", () => {
    render(<GlowLink href="/ores/quan">Quantanium</GlowLink>);
    const link = screen.getByRole("link", { name: "Quantanium" });
    expect(link).toHaveAttribute("href", "/ores/quan");
    expect(link).toHaveClass(
      "text-accent-primary",
      "transition-colors",
      "hover:text-accent-glow",
      "hover:underline",
    );
  });

  it("merges custom classes", () => {
    render(
      <GlowLink href="/compare" className="font-mono">
        QUAN
      </GlowLink>,
    );
    expect(screen.getByRole("link", { name: "QUAN" })).toHaveClass("font-mono");
  });
});
