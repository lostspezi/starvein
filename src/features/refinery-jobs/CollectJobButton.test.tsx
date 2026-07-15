import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderWithIntl } from "@/test/render";
import { CollectJobButton } from "./CollectJobButton";

const ITEMS = [
  { oreCode: "QUAN", oreName: "Quantainium", quantityScu: 32 },
  { oreCode: "GOLD", oreName: "Gold", quantityScu: 10 },
];

beforeEach(() => {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => ({ ok: true, json: async () => ({}) })),
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("CollectJobButton", () => {
  it("collects with edited refined quantities", async () => {
    const user = userEvent.setup();
    renderWithIntl(<CollectJobButton jobId="job-1" items={ITEMS} />, {
      locale: "en",
    });

    await user.click(screen.getByRole("button", { name: "Collect" }));

    const quan = screen.getByLabelText("Refined Quantainium (SCU)");
    expect(quan).toHaveValue(32);
    await user.clear(quan);
    await user.type(quan, "28.5");
    await user.click(
      screen.getByRole("button", { name: "Confirm collection" }),
    );

    expect(fetch).toHaveBeenCalledWith(
      "/api/refinery-jobs/job-1/collect",
      expect.objectContaining({ method: "POST" }),
    );
    const body = JSON.parse(
      (vi.mocked(fetch).mock.calls[0][1] as RequestInit).body as string,
    );
    expect(body).toEqual({
      transfer: [
        { oreCode: "QUAN", quantityScu: 28.5 },
        { oreCode: "GOLD", quantityScu: 10 },
      ],
    });
  });

  it("includes qualityRating in the transfer when a quality is entered", async () => {
    const user = userEvent.setup();
    renderWithIntl(<CollectJobButton jobId="job-1" items={ITEMS} />, {
      locale: "en",
    });

    await user.click(screen.getByRole("button", { name: "Collect" }));
    await user.type(
      screen.getByLabelText("Quality Quantainium (0–1000)"),
      "640",
    );
    await user.click(
      screen.getByRole("button", { name: "Confirm collection" }),
    );

    const body = JSON.parse(
      (vi.mocked(fetch).mock.calls[0][1] as RequestInit).body as string,
    );
    expect(body.transfer[0]).toEqual({
      oreCode: "QUAN",
      quantityScu: 32,
      qualityRating: 640,
    });
    expect(body.transfer[1].qualityRating).toBeUndefined();
  });

  it("collects without transfer when the checkbox is unchecked", async () => {
    const user = userEvent.setup();
    renderWithIntl(<CollectJobButton jobId="job-1" items={ITEMS} />, {
      locale: "en",
    });

    await user.click(screen.getByRole("button", { name: "Collect" }));
    await user.click(
      screen.getByRole("checkbox", {
        name: "Add refined output to my warehouse",
      }),
    );
    await user.click(
      screen.getByRole("button", { name: "Confirm collection" }),
    );

    const body = JSON.parse(
      (vi.mocked(fetch).mock.calls[0][1] as RequestInit).body as string,
    );
    expect(body).toEqual({});
  });

  it("can be cancelled without a request", async () => {
    const user = userEvent.setup();
    renderWithIntl(<CollectJobButton jobId="job-1" items={ITEMS} />, {
      locale: "en",
    });

    await user.click(screen.getByRole("button", { name: "Collect" }));
    await user.click(screen.getByRole("button", { name: "Cancel" }));

    expect(fetch).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Collect" })).toBeVisible();
  });
});
