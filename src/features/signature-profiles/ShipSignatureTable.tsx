import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { RarityTier } from "@/features/ores/ores.schema";
import type { SignatureProfile } from "./signature-profiles.schema";

export type ShipSignatureRow = SignatureProfile & {
  oreName: string;
  rarityTier: RarityTier;
};

const RARITY_TEXT_CLASS: Record<RarityTier, string> = {
  common: "text-rarity-common",
  uncommon: "text-rarity-uncommon",
  rare: "text-rarity-rare",
  epic: "text-rarity-epic",
  legendary: "text-rarity-legendary",
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
    <div className="overflow-x-auto rounded-lg border border-bg-nebula-2 bg-bg-nebula">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-bg-nebula-2 text-text-muted">
            <th className="px-4 py-3 font-medium">{t("table.mineral")}</th>
            <th className="px-4 py-3 font-medium">{t("table.signature")}</th>
            <th className="px-4 py-3 font-medium">{t("table.composition")}</th>
            <th className="px-4 py-3 font-medium">{t("table.secondaries")}</th>
          </tr>
        </thead>
        <tbody>
          {profiles.map((profile) => (
            <tr
              key={profile.oreCode}
              className="border-b border-bg-nebula-2 last:border-b-0 hover:bg-bg-nebula-2"
            >
              <td className="px-4 py-3">
                <Link
                  href={`/ores/${profile.oreCode.toLowerCase()}`}
                  className={`hover:underline ${RARITY_TEXT_CLASS[profile.rarityTier]}`}
                >
                  {profile.oreName}
                </Link>
              </td>
              <td className="px-4 py-3">
                <span className="font-mono text-accent-secondary">
                  {profile.signatureValue}
                </span>
              </td>
              <td className="px-4 py-3 font-mono text-text-muted">
                {formatRange(profile.dominantCompositionRange)}
              </td>
              <td className="px-4 py-3 text-text-muted">
                {profile.notes ?? "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
