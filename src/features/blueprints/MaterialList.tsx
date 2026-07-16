import { useTranslations } from "next-intl";
import {
  DataTable,
  DataTableHead,
  DataTableRow,
  DataTableTd,
  DataTableTh,
} from "@/lib/components/ui/DataTable";
import { GlowLink } from "@/lib/components/ui/GlowLink";
import type { Material } from "./materials.schema";

export function MaterialList({ materials }: { materials: Material[] }) {
  const t = useTranslations("materials");

  if (materials.length === 0) {
    return <p className="py-8 text-center text-text-muted">{t("empty")}</p>;
  }

  return (
    <DataTable>
      <DataTableHead>
        <DataTableTh>{t("table.name")}</DataTableTh>
        <DataTableTh className="hidden sm:table-cell">
          {t("table.code")}
        </DataTableTh>
        <DataTableTh>{t("table.kind")}</DataTableTh>
        <DataTableTh className="hidden md:table-cell">
          {t("table.ore")}
        </DataTableTh>
      </DataTableHead>
      <tbody>
        {materials.map((material) => (
          <DataTableRow
            key={material.code}
            id={material.code}
            className="scroll-mt-40 sm:scroll-mt-24"
          >
            <DataTableTd>
              <GlowLink href={`/materials/${material.code.toLowerCase()}`}>
                {material.name}
              </GlowLink>
            </DataTableTd>
            <DataTableTd className="hidden font-mono text-text-muted sm:table-cell">
              {material.code}
            </DataTableTd>
            <DataTableTd className="text-text-muted">
              {t(`kind.${material.kind}`)}
            </DataTableTd>
            <DataTableTd className="hidden font-mono md:table-cell">
              {material.oreCode ? (
                <GlowLink href={`/ores/${material.oreCode.toLowerCase()}`}>
                  {material.oreCode}
                </GlowLink>
              ) : (
                <span className="text-text-muted">{t("detail.none")}</span>
              )}
            </DataTableTd>
          </DataTableRow>
        ))}
      </tbody>
    </DataTable>
  );
}
