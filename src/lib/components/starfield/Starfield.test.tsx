import { render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Starfield } from "./Starfield";

function stubMatchMedia(matches: boolean) {
  const mediaQueryList = {
    matches,
    media: "(prefers-reduced-motion: reduce)",
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  };
  vi.stubGlobal("matchMedia", vi.fn().mockReturnValue(mediaQueryList));
  return mediaQueryList;
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("Starfield", () => {
  it("is hidden from assistive tech and never captures pointer events", () => {
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);
    const { container } = render(<Starfield />);
    const wrapper = container.firstElementChild;
    expect(wrapper).toHaveAttribute("aria-hidden", "true");
    expect(wrapper).toHaveClass("pointer-events-none", "fixed", "inset-0");
  });

  it("always renders the static CSS fallback layer", () => {
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);
    const { container } = render(<Starfield />);
    expect(container.querySelector(".starfield-fallback")).toBeInTheDocument();
  });

  it("does not crash and keeps the canvas hidden when WebGL is unavailable", () => {
    const getContext = vi
      .spyOn(HTMLCanvasElement.prototype, "getContext")
      .mockReturnValue(null);

    const { container } = render(<Starfield />);
    const canvas = container.querySelector("canvas");
    expect(canvas).toHaveClass("opacity-0");
    expect(getContext).toHaveBeenCalled();
  });

  it("never initializes WebGL under prefers-reduced-motion", () => {
    stubMatchMedia(true);
    const getContext = vi.spyOn(HTMLCanvasElement.prototype, "getContext");

    render(<Starfield />);
    expect(getContext).not.toHaveBeenCalled();
  });
});
