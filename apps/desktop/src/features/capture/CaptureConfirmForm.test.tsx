import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { IntlProvider } from "use-intl";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { messages } from "../../i18n/messages";
import { ApiError } from "../../lib/api";
import type { OcrCapture } from "../../lib/tauri";
import { CaptureConfirmForm } from "./CaptureConfirmForm";

const createRefineryJob = vi.fn();

vi.mock("../../lib/api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../lib/api")>()),
  createRefineryJob: (...args: unknown[]) => createRefineryJob(...args),
}));

const ORES = [
  {
    code: "QUAN",
    name_de: "Quantainium",
    name_en: "Quantainium",
    rarityTier: "legendary" as const,
    mineableBy: { ship: true, roc: false, fps: false },
  },
  {
    code: "LARA",
    name_de: "Laranit",
    name_en: "Laranite",
    rarityTier: "rare" as const,
    mineableBy: { ship: true, roc: false, fps: false },
  },
];

const TERMINALS = [
  {
    terminalId: 246,
    terminalName: "Refinement Processing - ARC-L1",
    starSystemName: "Stanton",
  },
  {
    terminalId: 788,
    terminalName: "Refinement Center - Levski",
    starSystemName: "Nyx",
  },
];

const METHODS = [
  {
    code: "DINYX",
    name: "Dinyx Solventation",
    ratingYield: 3,
    ratingCost: 1,
    ratingSpeed: 1,
    syncedAt: "2026-07-14T08:00:00.000Z",
  },
  {
    code: "FERRON",
    name: "Ferron Exchange",
    ratingYield: 2,
    ratingCost: 2,
    ratingSpeed: 2,
    syncedAt: "2026-07-14T08:00:00.000Z",
  },
];

const CAPTURE: OcrCapture = {
  source: "window",
  width: 1920,
  height: 1080,
  lines: [
    { text: "WORK ORDER", words: [] },
    { text: "Quantainium 32 SCU", words: [] },
    { text: "Laranite 1,250 cSCU", words: [] },
    { text: "PROCESSING TIME 2H 5M", words: [] },
    { text: "Dinyx Solventation", words: [] },
  ],
};

function renderForm(
  overrides: { onCreated?: () => void; capture?: OcrCapture } = {},
) {
  const onCreated = overrides.onCreated ?? vi.fn();
  render(
    <IntlProvider locale="en" messages={messages.en}>
      <CaptureConfirmForm
        token="tok-1"
        capture={overrides.capture ?? CAPTURE}
        ores={ORES}
        terminals={TERMINALS}
        methods={METHODS}
        onCreated={onCreated}
        onCancel={vi.fn()}
      />
    </IntlProvider>,
  );
  return { onCreated };
}

beforeEach(() => {
  createRefineryJob.mockReset();
});

describe("CaptureConfirmForm", () => {
  it("prefills ores, quantities, method and duration from the capture", () => {
    renderForm();

    expect(screen.getByDisplayValue("QUAN — Quantainium")).toBeInTheDocument();
    expect(screen.getByDisplayValue("32")).toBeInTheDocument();
    expect(screen.getByDisplayValue("12.5")).toBeInTheDocument();
    expect(screen.getByLabelText("Refinery method")).toHaveValue("DINYX");
    expect(screen.getByLabelText("Duration (minutes)")).toHaveValue(125);
  });

  it("preselects the terminal matched from the station header", () => {
    renderForm({
      capture: {
        ...CAPTURE,
        // OCR-Verleser der de-DE-Engine: "ARC-L1" wird als "ARC-LI" gelesen;
        // "REFINEMENT CENTER" steht auf jedem Terminal und darf nicht
        // fälschlich Levski treffen (realer Fehlgriff, 15.07.2026).
        lines: [
          ...CAPTURE.lines,
          { text: "REFINEMENT CENTER", words: [] },
          { text: "ARC-LI WIDE FOREST STATION", words: [] },
        ],
      },
    });

    expect(screen.getByLabelText("Refinery terminal")).toHaveValue("246");
  });

  it("leaves the terminal unselected when only the generic module header is captured", () => {
    renderForm({
      capture: {
        ...CAPTURE,
        lines: [...CAPTURE.lines, { text: "REFINEMENT CENTER", words: [] }],
      },
    });

    expect(screen.getByLabelText("Refinery terminal")).toHaveValue("");
  });

  it("submits the confirmed job to the API", async () => {
    createRefineryJob.mockResolvedValue({ id: "job-1" });
    const { onCreated } = renderForm();

    await userEvent.selectOptions(
      screen.getByLabelText("Refinery terminal"),
      "246",
    );
    await userEvent.click(screen.getByRole("button", { name: "Create job" }));

    expect(createRefineryJob).toHaveBeenCalledWith("tok-1", {
      terminalId: 246,
      methodCode: "DINYX",
      items: [
        { oreCode: "QUAN", quantityScu: 32 },
        { oreCode: "LARA", quantityScu: 12.5 },
      ],
      durationMinutes: 125,
    });
    await vi.waitFor(() => expect(onCreated).toHaveBeenCalled());
  });

  it("prefills and submits an OCR-detected quality value", async () => {
    createRefineryJob.mockResolvedValue({ id: "job-1" });
    const w = (text: string, x: number) => ({
      text,
      x,
      y: 0,
      width: text.length * 10,
      height: 18,
    });
    const captureWithQuality: OcrCapture = {
      source: "window",
      width: 1920,
      height: 1080,
      lines: [
        {
          text: "MATERIAL QUANTITY QUALITY",
          words: [w("MATERIAL", 10), w("QUANTITY", 200), w("QUALITY", 400)],
        },
        {
          text: "Quantainium 32 SCU 850",
          words: [
            w("Quantainium", 10),
            w("32", 205),
            w("SCU", 240),
            w("850", 405),
          ],
        },
        { text: "PROCESSING TIME 1H 30M", words: [] },
        { text: "Dinyx Solventation", words: [] },
      ],
    };
    const onCreated = vi.fn();
    render(
      <IntlProvider locale="en" messages={messages.en}>
        <CaptureConfirmForm
          token="tok-1"
          capture={captureWithQuality}
          ores={ORES}
          terminals={TERMINALS}
          methods={METHODS}
          onCreated={onCreated}
          onCancel={vi.fn()}
        />
      </IntlProvider>,
    );

    expect(screen.getByLabelText("Quality (0–1000)")).toHaveValue(850);

    await userEvent.selectOptions(
      screen.getByLabelText("Refinery terminal"),
      "246",
    );
    await userEvent.click(screen.getByRole("button", { name: "Create job" }));

    expect(createRefineryJob).toHaveBeenCalledWith("tok-1", {
      terminalId: 246,
      methodCode: "DINYX",
      items: [{ oreCode: "QUAN", quantityScu: 32, qualityRating: 850 }],
      durationMinutes: 90,
    });
    await vi.waitFor(() => expect(onCreated).toHaveBeenCalled());
  });

  it("requires a terminal before submitting", async () => {
    renderForm();

    await userEvent.click(screen.getByRole("button", { name: "Create job" }));

    expect(createRefineryJob).not.toHaveBeenCalled();
    expect(
      await screen.findByText("Pick the refinery terminal you are docked at."),
    ).toBeVisible();
  });

  it("surfaces rate-limit errors", async () => {
    createRefineryJob.mockRejectedValue(new ApiError(429));
    renderForm();

    await userEvent.selectOptions(
      screen.getByLabelText("Refinery terminal"),
      "246",
    );
    await userEvent.click(screen.getByRole("button", { name: "Create job" }));

    expect(
      await screen.findByText(
        "Rate limit reached — please wait a moment and try again.",
      ),
    ).toBeVisible();
  });
});
