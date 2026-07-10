import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Badge } from "./Badge";

describe("Badge", () => {
  it("renders the default chip shell", () => {
    render(<Badge>pending</Badge>);
    expect(screen.getByText("pending")).toHaveClass(
      "rounded",
      "bg-bg-nebula-2",
      "px-1.5",
      "py-0.5",
      "text-xs",
    );
  });

  it("applies semantic tones", () => {
    render(<Badge tone="success">verified</Badge>);
    expect(screen.getByText("verified")).toHaveClass("text-success");

    render(<Badge tone="warning">disputed</Badge>);
    expect(screen.getByText("disputed")).toHaveClass("text-warning");
  });

  it("merges custom classes for rarity coloring", () => {
    render(<Badge className="text-rarity-epic">epic</Badge>);
    expect(screen.getByText("epic")).toHaveClass("text-rarity-epic");
  });
});
