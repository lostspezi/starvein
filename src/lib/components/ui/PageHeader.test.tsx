import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PageHeader } from "./PageHeader";

describe("PageHeader", () => {
  it("renders the page title as h1 with a reveal animation", () => {
    render(<PageHeader title="Ores" />);
    const heading = screen.getByRole("heading", { level: 1, name: "Ores" });
    expect(heading).toHaveClass("text-2xl", "font-semibold");
    expect(heading.closest("header")).toHaveClass("animate-reveal");
  });

  it("renders an optional subtitle", () => {
    render(<PageHeader title="Ores" subtitle="All minables at a glance" />);
    expect(screen.getByText("All minables at a glance")).toHaveClass(
      "text-text-muted",
    );
  });

  it("renders no subtitle paragraph when omitted", () => {
    render(<PageHeader title="Ores" />);
    expect(screen.queryByRole("paragraph")).not.toBeInTheDocument();
  });
});
