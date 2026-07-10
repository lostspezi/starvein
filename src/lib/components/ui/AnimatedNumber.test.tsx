import { render, screen, waitFor } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import type { ReactNode } from "react";
import { describe, expect, it } from "vitest";
import { AnimatedNumber } from "./AnimatedNumber";

function Wrapper({ children }: { children: ReactNode }) {
  return (
    <NextIntlClientProvider locale="en" timeZone="UTC">
      {children}
    </NextIntlClientProvider>
  );
}

describe("AnimatedNumber", () => {
  it("renders the final value immediately on first render (SSR-safe)", () => {
    render(<AnimatedNumber value={82} />, { wrapper: Wrapper });
    expect(screen.getByText("82")).toBeInTheDocument();
  });

  it("formats locale-aware and appends the suffix", () => {
    render(<AnimatedNumber value={5500} suffix="%" />, { wrapper: Wrapper });
    expect(screen.getByText("5,500%")).toBeInTheDocument();
  });

  it("tweens to the new value when the prop changes", async () => {
    const { rerender } = render(<AnimatedNumber value={10} />, {
      wrapper: Wrapper,
    });
    rerender(<AnimatedNumber value={90} />);
    await waitFor(() => {
      expect(screen.getByText("90")).toBeInTheDocument();
    });
  });

  it("merges custom classes", () => {
    render(<AnimatedNumber value={5} className="font-mono" />, {
      wrapper: Wrapper,
    });
    expect(screen.getByText("5")).toHaveClass("font-mono");
  });
});
