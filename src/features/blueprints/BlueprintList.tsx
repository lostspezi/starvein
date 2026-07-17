import { useTranslations } from "next-intl";
import { Badge } from "@/lib/components/ui/Badge";
import {
  DataTable,
  DataTableHead,
  DataTableRow,
  DataTableTd,
  DataTableTh,
} from "@/lib/components/ui/DataTable";
import { GlowLink } from "@/lib/components/ui/GlowLink";
import type { Blueprint } from "./blueprints.schema";

export function BlueprintList({
  blueprints,
  collectedKeys,
}: {
  blueprints: Blueprint[];
  /** Keys der gesammelten Blueprints — undefined für anonyme Nutzer. */
  collectedKeys?: Set<string>;
}) {
  const t = useTranslations("blueprints");

  if (blueprints.length === 0) {
    return <p className="py-8 text-center text-text-muted">{t("empty")}</p>;
  }

  return (
    <DataTable>
      <DataTableHead>
        <DataTableTh>{t("table.name")}</DataTableTh>
        <DataTableTh>{t("table.category")}</DataTableTh>
        <DataTableTh className="hidden md:table-cell">
          {t("table.type")}
        </DataTableTh>
        <DataTableTh className="hidden sm:table-cell">
          {t("table.ingredients")}
        </DataTableTh>
      </DataTableHead>
      <tbody>
        {blueprints.map((blueprint) => (
          <DataTableRow
            key={blueprint.key}
            id={blueprint.slug}
            className="scroll-mt-40 sm:scroll-mt-32 xl:scroll-mt-24"
          >
            <DataTableTd>
              <span className="inline-flex items-center gap-2">
                <GlowLink href={`/blueprints/${blueprint.slug}`}>
                  {blueprint.outputName}
                </GlowLink>
                {collectedKeys?.has(blueprint.key) && (
                  <Badge tone="success">{t("collect.collected")}</Badge>
                )}
              </span>
            </DataTableTd>
            <DataTableTd className="text-text-muted">
              {t(`category.${blueprint.category}`)}
            </DataTableTd>
            <DataTableTd className="hidden font-mono text-xs text-text-muted md:table-cell">
              {blueprint.outputType}
            </DataTableTd>
            <DataTableTd className="hidden font-mono text-text-muted sm:table-cell">
              {blueprint.ingredients.length}
            </DataTableTd>
          </DataTableRow>
        ))}
      </tbody>
    </DataTable>
  );
}
