import { useFormatter, useTranslations } from "next-intl";
import {
  DataTable,
  DataTableHead,
  DataTableRow,
  DataTableTd,
  DataTableTh,
} from "@/lib/components/ui/DataTable";
import { Panel } from "@/lib/components/ui/Panel";

/**
 * Knackbare Erze eines Loadouts: pro ship-minebarem Erz die maximale
 * Steinmasse — vorberechnet von der Seite (oreBreakabilityRows aus dem
 * Rock-Calculator), die Komponente rendert nur. gadgetName benennt das
 * angesetzte Best-Case-Gadget; null = kein wirksames Gadget im Loadout.
 */
export function BreakabilityPanel({
  rows,
  gadgetName,
}: {
  rows: {
    oreCode: string;
    oreName: string;
    resistancePct: number;
    maxMass: number;
  }[];
  gadgetName: string | null;
}) {
  const t = useTranslations("loadouts.breakability");
  const tCalculator = useTranslations("calculator");
  const format = useFormatter();

  return (
    <Panel variant="glass" className="flex flex-col gap-2 p-4">
      <h2 className="text-base font-medium">{t("heading")}</h2>
      <DataTable>
        <DataTableHead>
          <DataTableTh>{t("oreHeader")}</DataTableTh>
          <DataTableTh className="text-right">
            {t("resistanceHeader")}
          </DataTableTh>
          <DataTableTh className="text-right">{t("massHeader")}</DataTableTh>
        </DataTableHead>
        <tbody>
          {rows.map((row) => (
            <DataTableRow key={row.oreCode}>
              <DataTableTd>{row.oreName}</DataTableTd>
              <DataTableTd className="text-right font-mono">
                {format.number(Math.round(row.resistancePct))} %
              </DataTableTd>
              {row.maxMass > 0 ? (
                <DataTableTd className="text-right font-mono text-accent-secondary">
                  {format.number(Math.round(row.maxMass))}
                </DataTableTd>
              ) : (
                <DataTableTd className="text-right text-text-muted">
                  {t("notBreakable")}
                </DataTableTd>
              )}
            </DataTableRow>
          ))}
        </tbody>
      </DataTable>
      {gadgetName !== null && (
        <p className="text-xs text-text-muted">
          {t("gadgetNote", { name: gadgetName })}
        </p>
      )}
      <p className="text-xs text-text-muted">{tCalculator("attribution")}</p>
    </Panel>
  );
}
