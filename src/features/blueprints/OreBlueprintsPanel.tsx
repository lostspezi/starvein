import { useTranslations } from "next-intl";
import {
  DataTable,
  DataTableHead,
  DataTableRow,
  DataTableTd,
  DataTableTh,
} from "@/lib/components/ui/DataTable";
import { GlowLink } from "@/lib/components/ui/GlowLink";
import type { BlueprintUsingOre } from "./blueprints.service";

/**
 * Zeigt auf der Erz-Detailseite, welche Blueprints dieses Erz verwenden.
 * Erze speisen fast das gesamte Crafting, daher kann die Liste lang werden —
 * angezeigt wird ein Ausschnitt mit Link auf die gefilterte Blueprint-Liste.
 */
export function OreBlueprintsPanel({
  entries,
  totalCount,
  materialCodes,
}: {
  entries: BlueprintUsingOre[];
  totalCount: number;
  /** Material-Codes des Erzes — für den "alle anzeigen"-Filter-Link. */
  materialCodes: string[];
}) {
  const t = useTranslations("blueprints");

  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-lg font-medium">{t("fromOre.heading")}</h2>
      {entries.length === 0 ? (
        <p className="py-4 text-text-muted">{t("fromOre.empty")}</p>
      ) : (
        <>
          <DataTable>
            <DataTableHead>
              <DataTableTh>{t("table.name")}</DataTableTh>
              <DataTableTh>{t("table.category")}</DataTableTh>
              <DataTableTh className="hidden sm:table-cell">
                {t("table.ingredients")}
              </DataTableTh>
            </DataTableHead>
            <tbody>
              {entries.map(({ blueprint, viaMaterials }) => (
                <DataTableRow key={blueprint.key}>
                  <DataTableTd>
                    <GlowLink href={`/blueprints/${blueprint.slug}`}>
                      {blueprint.outputName}
                    </GlowLink>
                  </DataTableTd>
                  <DataTableTd className="text-text-muted">
                    {t(`category.${blueprint.category}`)}
                  </DataTableTd>
                  <DataTableTd className="hidden text-text-muted sm:table-cell">
                    {t("fromOre.viaMaterial", {
                      material: viaMaterials.map((m) => m.name).join(", "),
                    })}
                  </DataTableTd>
                </DataTableRow>
              ))}
            </tbody>
          </DataTable>
          {totalCount > entries.length && materialCodes.length > 0 && (
            <p>
              <GlowLink href={`/blueprints?material=${materialCodes[0]}`}>
                {t("fromOre.showAll", { count: totalCount })}
              </GlowLink>
            </p>
          )}
        </>
      )}
    </section>
  );
}
