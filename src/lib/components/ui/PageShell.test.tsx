import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PageShell } from "./PageShell";

describe("PageShell", () => {
  it("renders a centered main column (mobile-first paddings)", () => {
    render(<PageShell>page content</PageShell>);
    const main = screen.getByRole("main");
    expect(main).toHaveTextContent("page content");
    expect(main).toHaveClass(
      "mx-auto",
      "flex",
      "w-full",
      "max-w-4xl",
      "flex-col",
      "gap-4",
      "px-4",
      "py-6",
      "sm:px-6",
      "sm:py-8",
    );
  });

  it("supports a wide variant", () => {
    render(<PageShell width="wide">wide content</PageShell>);
    expect(screen.getByRole("main")).toHaveClass("max-w-5xl");
  });

  it("supports an xl dashboard variant (~1440px)", () => {
    render(<PageShell width="xl">dashboard content</PageShell>);
    expect(screen.getByRole("main")).toHaveClass("max-w-[90rem]");
  });
});
