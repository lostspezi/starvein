import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { RarityTier } from "@/features/ores/ores.schema";
import {
  DataTable,
  DataTableHead,
  DataTableRow,
  DataTableTd,
  DataTableTh,
} from "@/lib/components/ui/DataTable";
import { RARITY_TEXT_CLASS } from "@/lib/rarity";
import type { SignatureProfile } from "./signature-profiles.schema";

export type ShipSignatureRow = SignatureProfile & {
  oreName: string;
  rarityTier: RarityTier;
};

function formatRange(range: { min: number; max: number } | undefined): string {
  return range ? `${range.min}–${range.max}%` : "—";
}

export function ShipSignatureTable({
  profiles,
}: {
  profiles: ShipSignatureRow[];
}) {
  const t = useTranslations("signatures");

  return (
    <DataTable>
      <DataTableHead>
        <DataTableTh>{t("table.mineral")}</DataTableTh>
        <DataTableTh>{t("table.signature")}</DataTableTh>
        <DataTableTh>{t("table.composition")}</DataTableTh>
        <DataTableTh className="hidden md:table-cell">
          {t("table.secondaries")}
        </DataTableTh>
      </DataTableHead>
      <tbody>
        {profiles.map((profile) => (
          <DataTableRow key={profile.oreCode}>
            <DataTableTd>
              <Link
                href={`/ores/${profile.oreCode.toLowerCase()}`}
                className={`transition-colors duration-150 hover:underline ${RARITY_TEXT_CLASS[profile.rarityTier]}`}
              >
                {profile.oreName}
              </Link>
            </DataTableTd>
            <DataTableTd>
              <span className="font-mono text-accent-secondary">
                {profile.signatureValue}
              </span>
            </DataTableTd>
            <DataTableTd className="font-mono text-text-muted">
              {formatRange(profile.dominantCompositionRange)}
            </DataTableTd>
            <DataTableTd className="hidden text-text-muted md:table-cell">
              {profile.notes ?? "—"}
            </DataTableTd>
          </DataTableRow>
        ))}
      </tbody>
    </DataTable>
  );
}
