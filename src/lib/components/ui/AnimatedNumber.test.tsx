import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AnimatedNumber } from "./AnimatedNumber";

describe("AnimatedNumber", () => {
  it("renders the final value immediately on first render (SSR-safe)", () => {
    render(<AnimatedNumber value={82} />);
    expect(screen.getByText("82")).toBeInTheDocument();
  });

  it("applies a custom format", () => {
    render(<AnimatedNumber value={82} format={(n) => `${Math.round(n)}%`} />);
    expect(screen.getByText("82%")).toBeInTheDocument();
  });

  it("tweens to the new value when the prop changes", async () => {
    const { rerender } = render(<AnimatedNumber value={10} />);
    rerender(<AnimatedNumber value={90} />);
    await waitFor(() => {
      expect(screen.getByText("90")).toBeInTheDocument();
    });
  });

  it("merges custom classes", () => {
    render(<AnimatedNumber value={5} className="font-mono" />);
    expect(screen.getByText("5")).toHaveClass("font-mono");
  });
});
