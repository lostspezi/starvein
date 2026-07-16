import { useLocale, useTranslations } from "next-intl";
import { Badge } from "@/lib/components/ui/Badge";
import {
  DataTable,
  DataTableHead,
  DataTableRow,
  DataTableTd,
  DataTableTh,
} from "@/lib/components/ui/DataTable";
import { GlowLink } from "@/lib/components/ui/GlowLink";
import type { CraftableBlueprint } from "./craftable-blueprints.service";
import { formatQuantityValue, quantityUnitKey } from "./format-quantity";
import type { Material } from "./materials.schema";

/**
 * Liste bewerteter Blueprints. Bei "partial" wird der Engpass benannt,
 * damit klar ist, was noch fehlt — mit der Einheit des jeweiligen Materials.
 */
export function CraftableList({
  entries,
  materialsByCode,
  emptyLabel,
}: {
  entries: CraftableBlueprint[];
  materialsByCode: Record<string, Material>;
  emptyLabel: string;
}) {
  const t = useTranslations("craftable");
  const tBlueprints = useTranslations("blueprints");
  const locale = useLocale();

  if (entries.length === 0) {
    return <p className="py-6 text-text-muted">{emptyLabel}</p>;
  }

  return (
    <DataTable>
      <DataTableHead>
        <DataTableTh>{tBlueprints("table.name")}</DataTableTh>
        <DataTableTh>{tBlueprints("table.category")}</DataTableTh>
        <DataTableTh>{t("status.craftable")}</DataTableTh>
      </DataTableHead>
      <tbody>
        {entries.map(({ blueprint, craftability }) => (
          <DataTableRow key={blueprint.key}>
            <DataTableTd>
              <GlowLink href={`/blueprints/${blueprint.slug}`}>
                {blueprint.outputName}
              </GlowLink>
            </DataTableTd>
            <DataTableTd className="text-text-muted">
              {tBlueprints(`category.${blueprint.category}`)}
            </DataTableTd>
            <DataTableTd>
              {craftability.status === "craftable" ? (
                <Badge tone="success">
                  {t("maxCraftable", { count: craftability.maxCraftable })}
                </Badge>
              ) : (
                <span className="flex flex-wrap gap-1">
                  {craftability.components
                    .filter((component) => component.shortfall > 0)
                    .map((component) => (
                      <Badge key={component.materialCode} tone="warning">
                        {t("missingLabel", {
                          amount: tBlueprints(
                            `units.${quantityUnitKey(component.kind)}`,
                            {
                              value: formatQuantityValue(
                                component.shortfall,
                                component.kind,
                                locale,
                              ),
                            },
                          ),
                          material:
                            materialsByCode[component.materialCode]?.name ??
                            component.materialCode,
                        })}
                      </Badge>
                    ))}
                </span>
              )}
            </DataTableTd>
          </DataTableRow>
        ))}
      </tbody>
    </DataTable>
  );
}
