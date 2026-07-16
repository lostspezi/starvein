import { useLocale, useTranslations } from "next-intl";
import {
  DataTable,
  DataTableHead,
  DataTableRow,
  DataTableTd,
  DataTableTh,
} from "@/lib/components/ui/DataTable";
import { GlowLink } from "@/lib/components/ui/GlowLink";
import type { BlueprintIngredient } from "./blueprints.schema";
import { formatQuantityValue, quantityUnitKey } from "./format-quantity";
import type { Material } from "./materials.schema";

/**
 * Zutatenliste eines Blueprints. materialsByCode liefert Anzeigename und
 * Erz-Link; unbekannte Codes fallen auf den Code zurück (kein FK in Mongo).
 */
export function BlueprintComponentsTable({
  ingredients,
  materialsByCode,
}: {
  ingredients: BlueprintIngredient[];
  materialsByCode: Record<string, Material>;
}) {
  const t = useTranslations("blueprints");
  const locale = useLocale();

  return (
    <DataTable>
      <DataTableHead>
        <DataTableTh>{t("detail.ingredientTable.material")}</DataTableTh>
        <DataTableTh>{t("detail.ingredientTable.quantity")}</DataTableTh>
        <DataTableTh className="hidden sm:table-cell">
          {t("detail.ingredientTable.ore")}
        </DataTableTh>
      </DataTableHead>
      <tbody>
        {ingredients.map((ingredient) => {
          const material = materialsByCode[ingredient.materialCode];
          return (
            <DataTableRow key={ingredient.materialCode}>
              <DataTableTd>
                {material ? (
                  <GlowLink
                    href={`/materials/${ingredient.materialCode.toLowerCase()}`}
                  >
                    {material.name}
                  </GlowLink>
                ) : (
                  <span className="font-mono text-text-muted">
                    {ingredient.materialCode}
                  </span>
                )}
              </DataTableTd>
              <DataTableTd className="font-mono text-accent-secondary">
                {t(`units.${quantityUnitKey(ingredient.kind)}`, {
                  value: formatQuantityValue(
                    ingredient.quantity,
                    ingredient.kind,
                    locale,
                  ),
                })}
              </DataTableTd>
              <DataTableTd className="hidden font-mono sm:table-cell">
                {material?.oreCode ? (
                  <GlowLink href={`/ores/${material.oreCode.toLowerCase()}`}>
                    {material.oreCode}
                  </GlowLink>
                ) : (
                  <span className="text-text-muted">{t("detail.none")}</span>
                )}
              </DataTableTd>
            </DataTableRow>
          );
        })}
      </tbody>
    </DataTable>
  );
}
