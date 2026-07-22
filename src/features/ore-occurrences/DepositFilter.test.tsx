import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NuqsTestingAdapter, type UrlUpdateEvent } from "nuqs/adapters/testing";
import { describe, expect, it, vi } from "vitest";
import { renderWithIntl } from "@/test/render";
import { DepositFilter } from "./DepositFilter";

describe("DepositFilter", () => {
  it("sets the deposit query param on click", async () => {
    const user = userEvent.setup();
    const onUrlUpdate = vi.fn<(event: UrlUpdateEvent) => void>();
    renderWithIntl(
      <NuqsTestingAdapter searchParams="" onUrlUpdate={onUrlUpdate}>
        <DepositFilter />
      </NuqsTestingAdapter>,
      { locale: "en" },
    );

    await user.click(screen.getByRole("button", { name: "Primary deposit" }));

    const event = onUrlUpdate.mock.calls.at(-1)?.[0];
    expect(event?.searchParams.get("deposit")).toBe("primary");
  });
});
