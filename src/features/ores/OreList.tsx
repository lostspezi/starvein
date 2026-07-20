import { useFormatter, useTranslations } from "next-intl";
import { SignatureExpandRow } from "@/features/signature-profiles/SignatureExpandRow";
import type { SignatureProfile } from "@/features/signature-profiles/signature-profiles.schema";
import {
  DataTable,
  DataTableHead,
  DataTableTd,
  DataTableTh,
} from "@/lib/components/ui/DataTable";
import { GlowLink } from "@/lib/components/ui/GlowLink";
import { RARITY_TEXT_CLASS } from "@/lib/rarity";
import { MINING_METHODS, type Ore } from "./ores.schema";

/**
 * Erz-Katalog-Zeile: die Signatur-/Preis-Anreicherung ist optional, damit die
 * Komponente auch mit reinen {@link Ore}-Daten (z. B. in Tests) rendert.
 */
export type OreListDisplayRow = Ore & {
  signatures?: SignatureProfile[];
  bestRawSell?: number | null;
  bestRefinedSell?: number | null;
};

function formatSignatureBase(profile: SignatureProfile): string {
  if (profile.signatureValue !== undefined) {
    return String(profile.signatureValue);
  }
  return `${profile.signatureRange?.min}–${profile.signatureRange?.max}`;
}

export function OreList({ ores }: { ores: OreListDisplayRow[] }) {
  const t = useTranslations("ores");
  const format = useFormatter();

  const formatSell = (price: number | null | undefined) =>
    price == null ? "–" : format.number(price);

  if (ores.length === 0) {
    return <p className="py-8 text-center text-text-muted">{t("empty")}</p>;
  }

  // Name + Code + Rarity + Methods + Signature + Sell(raw) + Sell(refined) + Chevron
  const colSpan = 8;

  return (
    <DataTable>
      <DataTableHead>
        <DataTableTh>{t("table.name")}</DataTableTh>
        <DataTableTh className="hidden sm:table-cell">
          {t("table.code")}
        </DataTableTh>
        <DataTableTh>{t("table.rarity")}</DataTableTh>
        <DataTableTh>{t("table.methods")}</DataTableTh>
        <DataTableTh className="hidden sm:table-cell">
          {t("table.signature")}
        </DataTableTh>
        <DataTableTh className="hidden text-right md:table-cell">
          {t("table.sellRaw")}
        </DataTableTh>
        <DataTableTh className="text-right">
          {t("table.sellRefined")}
        </DataTableTh>
        <DataTableTh className="w-8" />
      </DataTableHead>
      <tbody>
        {ores.map((ore) => {
          // Basis-Signatur je Methode (ship/roc/fps) in fester Reihenfolge —
          // Ship identifiziert das Mineral (Akzentfarbe), ROC/FPS nur die Größe.
          const orderedSignatures = MINING_METHODS.map((method) =>
            (ore.signatures ?? []).find((profile) => profile.method === method),
          ).filter((profile): profile is SignatureProfile => profile != null);

          return (
            <SignatureExpandRow
              key={ore.code}
              id={ore.code}
              className="scroll-mt-40 sm:scroll-mt-32 xl:scroll-mt-24"
              colSpan={colSpan}
              expandLabel={t("table.expand")}
              collapseLabel={t("table.collapse")}
              pricesInPanel={false}
              emptyLabel={t("table.noSignature")}
              panels={orderedSignatures.map((profile) => ({
                method: profile.method,
                signatureValue: profile.signatureValue,
                signatureRange: profile.signatureRange,
                dominantCompositionRange: profile.dominantCompositionRange,
              }))}
              rawSell={ore.bestRawSell ?? null}
              refinedSell={ore.bestRefinedSell ?? null}
              summary={
                <>
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
                  <DataTableTd className="hidden font-mono text-xs sm:table-cell">
                    {orderedSignatures.length === 0 ? (
                      <span className="text-text-muted">—</span>
                    ) : (
                      orderedSignatures.map((profile, index) => (
                        <span key={profile.method}>
                          {index > 0 && (
                            <span className="text-text-muted"> · </span>
                          )}
                          <span
                            className={
                              profile.method === "ship"
                                ? "text-accent-secondary"
                                : "text-text-muted"
                            }
                          >
                            {formatSignatureBase(profile)}
                          </span>
                        </span>
                      ))
                    )}
                  </DataTableTd>
                  <DataTableTd className="hidden text-right font-mono md:table-cell">
                    {formatSell(ore.bestRawSell)}
                  </DataTableTd>
                  <DataTableTd className="text-right font-mono">
                    {formatSell(ore.bestRefinedSell)}
                  </DataTableTd>
                </>
              }
            />
          );
        })}
      </tbody>
    </DataTable>
  );
}
