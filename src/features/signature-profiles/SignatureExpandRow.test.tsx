import { fireEvent, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { renderWithIntl } from "@/test/render";
import { SignatureExpandRow } from "./SignatureExpandRow";

function renderRow(
  props: Partial<React.ComponentProps<typeof SignatureExpandRow>> = {},
) {
  return renderWithIntl(
    <table>
      <tbody>
        <SignatureExpandRow
          colSpan={3}
          expandLabel="Show signature cluster and prices"
          collapseLabel="Hide signature cluster and prices"
          summary={
            <>
              <td>Bexalite</td>
              <td>ship</td>
            </>
          }
          panels={[{ method: "ship", signatureValue: 3600 }]}
          rawSell={12400}
          refinedSell={16100}
          {...props}
        />
      </tbody>
    </table>,
    { locale: "en" },
  );
}

describe("SignatureExpandRow", () => {
  it("keeps the detail out of the DOM until expanded", () => {
    renderRow();

    expect(screen.getByText("Bexalite")).toBeVisible();
    expect(screen.queryByText("7,200")).not.toBeInTheDocument();

    const toggle = screen.getByRole("button", {
      name: "Show signature cluster and prices",
    });
    expect(toggle).toHaveAttribute("aria-expanded", "false");
  });

  it("renders the single cluster with prices when expanded", () => {
    renderRow();

    fireEvent.click(
      screen.getByRole("button", {
        name: "Show signature cluster and prices",
      }),
    );

    expect(
      screen.getByText("Signature cluster (identifies mineral)"),
    ).toBeVisible();
    expect(screen.getByText("7,200")).toBeVisible();
    expect(screen.getByText("12,400")).toBeVisible();
    expect(screen.getByText("16,100")).toBeVisible();
  });

  it("shows prices once and a panel per method when pricesInPanel is false", () => {
    renderRow({
      pricesInPanel: false,
      panels: [
        { method: "ship", signatureValue: 3585 },
        { method: "roc", signatureValue: 4000 },
      ],
      rawSell: 19000,
      refinedSell: 28000,
    });

    fireEvent.click(
      screen.getByRole("button", {
        name: "Show signature cluster and prices",
      }),
    );

    expect(
      screen.getByText("Signature cluster (identifies mineral)"),
    ).toBeVisible();
    expect(
      screen.getByText("Deposit size (not mineral-specific)"),
    ).toBeVisible();
    expect(screen.getByText("7,170")).toBeVisible();
    expect(screen.getByText("8,000")).toBeVisible();
    expect(screen.getByText("19,000")).toBeVisible();
    expect(screen.getByText("28,000")).toBeVisible();
  });

  it("shows the empty label when there are no signature panels", () => {
    renderRow({
      pricesInPanel: false,
      panels: [],
      emptyLabel: "No scan signature on record.",
      rawSell: null,
      refinedSell: null,
    });

    fireEvent.click(
      screen.getByRole("button", {
        name: "Show signature cluster and prices",
      }),
    );

    expect(screen.getByText("No scan signature on record.")).toBeVisible();
  });
});
