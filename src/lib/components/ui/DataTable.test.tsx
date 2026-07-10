import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  DataTable,
  DataTableHead,
  DataTableRow,
  DataTableTd,
  DataTableTh,
} from "./DataTable";

function renderTable() {
  return render(
    <DataTable>
      <DataTableHead>
        <DataTableTh>Name</DataTableTh>
      </DataTableHead>
      <tbody>
        <DataTableRow>
          <DataTableTd>Quantanium</DataTableTd>
        </DataTableRow>
      </tbody>
    </DataTable>,
  );
}

describe("DataTable", () => {
  it("wraps the table in a scrollable panel shell", () => {
    renderTable();
    const table = screen.getByRole("table");
    expect(table).toHaveClass("w-full", "text-left", "text-sm");
    expect(table.parentElement).toHaveClass(
      "overflow-x-auto",
      "rounded-lg",
      "border-bg-nebula-2",
      "bg-bg-nebula",
    );
  });

  it("styles the header row muted with a divider", () => {
    renderTable();
    const headerCell = screen.getByRole("columnheader", { name: "Name" });
    expect(headerCell).toHaveClass("px-4", "py-3", "font-medium");
    expect(headerCell.closest("tr")).toHaveClass(
      "border-b",
      "border-bg-nebula-2",
      "text-text-muted",
    );
  });

  it("gives body rows a hover transition", () => {
    renderTable();
    const row = screen.getByText("Quantanium").closest("tr");
    expect(row).toHaveClass(
      "border-b",
      "last:border-b-0",
      "transition-colors",
      "hover:bg-bg-nebula-2",
    );
  });

  it("merges custom cell classes, custom utilities win", () => {
    render(
      <DataTable>
        <tbody>
          <DataTableRow>
            <DataTableTd className="hidden sm:table-cell">Method</DataTableTd>
          </DataTableRow>
        </tbody>
      </DataTable>,
    );
    expect(screen.getByText("Method")).toHaveClass("hidden", "sm:table-cell");
  });
});
