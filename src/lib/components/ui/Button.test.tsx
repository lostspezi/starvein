import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Button } from "./Button";

describe("Button", () => {
  it("renders the primary CTA with glow hover", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Sign in</Button>);

    const button = screen.getByRole("button", { name: "Sign in" });
    expect(button).toHaveClass(
      "bg-accent-primary",
      "text-bg-void",
      "hover:bg-accent-glow",
      "hover:shadow-glow-primary",
      "disabled:opacity-50",
    );
    await user.click(button);
    expect(onClick).toHaveBeenCalledOnce();
  });

  it("renders a ghost variant", () => {
    render(<Button variant="ghost">Cancel</Button>);
    expect(screen.getByRole("button", { name: "Cancel" })).toHaveClass(
      "text-text-muted",
      "hover:bg-bg-nebula-2",
    );
  });

  it("defaults to type=button and forwards disabled", () => {
    render(<Button disabled>Wait</Button>);
    const button = screen.getByRole("button", { name: "Wait" });
    expect(button).toHaveAttribute("type", "button");
    expect(button).toBeDisabled();
  });
});
