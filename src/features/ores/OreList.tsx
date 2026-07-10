import { useTranslations } from "next-intl";
import {
  DataTable,
  DataTableHead,
  DataTableRow,
  DataTableTd,
  DataTableTh,
} from "@/lib/components/ui/DataTable";
import { GlowLink } from "@/lib/components/ui/GlowLink";
import { RARITY_TEXT_CLASS } from "@/lib/rarity";
import { MINING_METHODS, type Ore } from "./ores.schema";

export function OreList({ ores }: { ores: Ore[] }) {
  const t = useTranslations("ores");

  if (ores.length === 0) {
    return <p className="py-8 text-center text-text-muted">{t("empty")}</p>;
  }

  return (
    <DataTable>
      <DataTableHead>
        <DataTableTh>{t("table.name")}</DataTableTh>
        <DataTableTh className="hidden sm:table-cell">
          {t("table.code")}
        </DataTableTh>
        <DataTableTh>{t("table.rarity")}</DataTableTh>
        <DataTableTh>{t("table.methods")}</DataTableTh>
      </DataTableHead>
      <tbody>
        {ores.map((ore) => (
          <DataTableRow
            key={ore.code}
            id={ore.code}
            className="scroll-mt-40 sm:scroll-mt-24"
          >
            <DataTableTd>
              <GlowLink href={`/ores/${ore.code.toLowerCase()}`}>
                {ore.name_en}
              </GlowLink>
            </DataTableTd>
            <DataTableTd className="hidden font-mono text-text-muted sm:table-cell">
              {ore.code}
            </DataTableTd>
            <DataTableTd
              className={`font-medium ${RARITY_TEXT_CLASS[ore.rarityTier]}`}
            >
              {t(`rarity.${ore.rarityTier}`)}
            </DataTableTd>
            <DataTableTd className="text-text-muted">
              {MINING_METHODS.filter((method) => ore.mineableBy[method])
                .map((method) => t(`method.${method}`))
                .join(" · ")}
            </DataTableTd>
          </DataTableRow>
        ))}
      </tbody>
    </DataTable>
  );
}
