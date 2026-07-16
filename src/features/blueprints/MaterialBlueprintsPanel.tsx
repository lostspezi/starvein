import { useTranslations } from "next-intl";
import {
  DataTable,
  DataTableHead,
  DataTableRow,
  DataTableTd,
  DataTableTh,
} from "@/lib/components/ui/DataTable";
import { GlowLink } from "@/lib/components/ui/GlowLink";
import type { Blueprint } from "./blueprints.schema";

/**
 * Reverse-Lookup auf der Material-Detailseite: was lässt sich mit diesem
 * Material craften. Zeigt einen Ausschnitt plus Link auf die gefilterte Liste.
 */
export function MaterialBlueprintsPanel({
  blueprints,
  totalCount,
  materialCode,
}: {
  blueprints: Blueprint[];
  totalCount: number;
  materialCode: string;
}) {
  const t = useTranslations("blueprints");

  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-lg font-medium">{t("usedIn.heading")}</h2>
      {blueprints.length === 0 ? (
        <p className="py-4 text-text-muted">{t("usedIn.empty")}</p>
      ) : (
        <>
          <DataTable>
            <DataTableHead>
              <DataTableTh>{t("table.name")}</DataTableTh>
              <DataTableTh>{t("table.category")}</DataTableTh>
              <DataTableTh className="hidden sm:table-cell">
                {t("table.type")}
              </DataTableTh>
            </DataTableHead>
            <tbody>
              {blueprints.map((blueprint) => (
                <DataTableRow key={blueprint.key}>
                  <DataTableTd>
                    <GlowLink href={`/blueprints/${blueprint.slug}`}>
                      {blueprint.outputName}
                    </GlowLink>
                  </DataTableTd>
                  <DataTableTd className="text-text-muted">
                    {t(`category.${blueprint.category}`)}
                  </DataTableTd>
                  <DataTableTd className="hidden font-mono text-xs text-text-muted sm:table-cell">
                    {blueprint.outputType}
                  </DataTableTd>
                </DataTableRow>
              ))}
            </tbody>
          </DataTable>
          {totalCount > blueprints.length && (
            <p>
              <GlowLink href={`/blueprints?material=${materialCode}`}>
                {t("fromOre.showAll", { count: totalCount })}
              </GlowLink>
            </p>
          )}
        </>
      )}
    </section>
  );
}
