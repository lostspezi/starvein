import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderWithIntl } from "@/test/render";
import { FavoriteButton } from "./FavoriteButton";

beforeEach(() => {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => ({ ok: true, json: async () => ({ ok: true }) })),
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("FavoriteButton", () => {
  it("renders nothing for anonymous users", () => {
    const { container } = renderWithIntl(
      <FavoriteButton
        systemCode="STANTON"
        bodySlug="daymar"
        initialIsFavorite={false}
        isAuthenticated={false}
      />,
      { locale: "en" },
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("adds a favorite on click", async () => {
    const user = userEvent.setup();
    renderWithIntl(
      <FavoriteButton
        systemCode="STANTON"
        bodySlug="daymar"
        initialIsFavorite={false}
        isAuthenticated
      />,
      { locale: "en" },
    );

    const button = screen.getByRole("button", { name: "Save as favorite" });
    expect(button).toHaveAttribute("aria-pressed", "false");

    await user.click(button);

    expect(fetch).toHaveBeenCalledWith(
      "/api/favorites",
      expect.objectContaining({ method: "POST" }),
    );
    expect(
      screen.getByRole("button", { name: "Remove favorite" }),
    ).toHaveAttribute("aria-pressed", "true");
  });

  it("removes a favorite on second click", async () => {
    const user = userEvent.setup();
    renderWithIntl(
      <FavoriteButton
        systemCode="STANTON"
        bodySlug="daymar"
        initialIsFavorite
        isAuthenticated
      />,
      { locale: "en" },
    );

    await user.click(screen.getByRole("button", { name: "Remove favorite" }));

    expect(fetch).toHaveBeenCalledWith(
      "/api/favorites",
      expect.objectContaining({ method: "DELETE" }),
    );
    expect(
      screen.getByRole("button", { name: "Save as favorite" }),
    ).toBeVisible();
  });
});
