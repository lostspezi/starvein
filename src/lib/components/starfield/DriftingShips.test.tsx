import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { DriftingShips } from "./DriftingShips";

describe("DriftingShips", () => {
  it("is decorative: hidden from assistive tech, no pointer events, behind content", () => {
    const { container } = render(<DriftingShips />);
    const wrapper = container.firstElementChild;
    expect(wrapper).toHaveAttribute("aria-hidden", "true");
    expect(wrapper).toHaveClass(
      "pointer-events-none",
      "fixed",
      "inset-0",
      "-z-10",
      "overflow-hidden",
    );
  });

  it("only renders on desktop widths", () => {
    const { container } = render(<DriftingShips />);
    expect(container.firstElementChild).toHaveClass("hidden", "lg:block");
  });

  it("contains a prospector and a mole silhouette", () => {
    const { container } = render(<DriftingShips />);
    expect(
      container.querySelector('[data-ship="prospector"]'),
    ).toBeInTheDocument();
    expect(container.querySelector('[data-ship="mole"]')).toBeInTheDocument();
  });

  it("parks the ships offscreen when animations are disabled", () => {
    // Basisposition (ohne laufende Animation, z. B. reduced-motion) liegt
    // links außerhalb des Viewports — die Keyframes bewegen sie herein.
    const { container } = render(<DriftingShips />);
    for (const ship of container.querySelectorAll("[data-ship]")) {
      const wrapper = ship.closest("[data-ship-track]");
      expect(wrapper).not.toBeNull();
      expect((wrapper as HTMLElement).style.left).toBe("-20%");
    }
  });
});
