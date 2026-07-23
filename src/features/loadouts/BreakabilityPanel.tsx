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
 * Maximale knackbare Steinmasse eines Loadouts je Resistenz-Stufe —
 * vorberechnet von der Seite (maxBreakableMass aus dem Rock-Calculator),
 * die Komponente rendert nur. gadgetName benennt das angesetzte Best-Case-
 * Gadget; null = kein wirksames Gadget im Loadout.
 */
export function BreakabilityPanel({
  tiers,
  gadgetName,
}: {
  tiers: { resistancePct: number; maxMass: number }[];
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
          <DataTableTh>{t("resistanceHeader")}</DataTableTh>
          <DataTableTh className="text-right">{t("massHeader")}</DataTableTh>
        </DataTableHead>
        <tbody>
          {tiers.map((tier) => (
            <DataTableRow key={tier.resistancePct}>
              <DataTableTd className="font-mono">
                {tier.resistancePct} %
              </DataTableTd>
              <DataTableTd className="text-right font-mono text-accent-secondary">
                {format.number(Math.round(tier.maxMass))}
              </DataTableTd>
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
