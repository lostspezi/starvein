import { useTranslations } from "next-intl";
import { MINING_METHODS } from "@/features/ores/ores.schema";
import { cn } from "@/lib/cn";
import { AnimatedNumber } from "@/lib/components/ui/AnimatedNumber";
import { GlowLink } from "@/lib/components/ui/GlowLink";
import { panelClasses } from "@/lib/components/ui/Panel";
import { RARITY_TEXT_CLASS } from "@/lib/rarity";
import type { OreComparisonColumn } from "./compare.service";

function Row({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-0.5 border-t border-bg-nebula-2 py-2 first:border-t-0">
      <span className="text-xs text-text-muted">{label}</span>
      <span className="text-sm">{children}</span>
    </div>
  );
}

/** Vergleichskarten: mobile gestapelt, ab sm nebeneinander. */
export function CompareGrid({ columns }: { columns: OreComparisonColumn[] }) {
  const t = useTranslations();

  if (columns.length === 0) {
    return (
      <p className="py-8 text-center text-text-muted">{t("compare.empty")}</p>
    );
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {columns.map((column, index) => (
        <article
          key={column.ore.code}
          className={cn(panelClasses(), "animate-reveal flex flex-col p-4")}
          style={{ animationDelay: `${Math.min(index, 9) * 40}ms` }}
        >
          <h2 className="text-lg font-semibold">
            {column.ore.name_en}{" "}
            <span className="font-mono text-sm text-text-muted">
              {column.ore.code}
            </span>
          </h2>

          <Row label={t("compare.rarity")}>
            <span className={RARITY_TEXT_CLASS[column.ore.rarityTier]}>
              {t(`ores.rarity.${column.ore.rarityTier}`)}
            </span>
          </Row>

          <Row label={t("compare.methods")}>
            {MINING_METHODS.filter((method) => column.ore.mineableBy[method])
              .map((method) => t(`ores.method.${method}`))
              .join(" · ")}
          </Row>

          <Row label={t("compare.shipSignature")}>
            {column.shipSignature?.signatureValue ? (
              <>
                <span className="font-mono text-accent-secondary">
                  {column.shipSignature.signatureValue}
                </span>
                {column.shipSignature.dominantCompositionRange && (
                  <span className="ml-2 text-text-muted">
                    {column.shipSignature.dominantCompositionRange.min}–
                    {column.shipSignature.dominantCompositionRange.max}%
                  </span>
                )}
              </>
            ) : (
              t("compare.noData")
            )}
          </Row>

          <Row label={t("compare.groundSignature")}>
            {column.groundSignatures.length > 0
              ? column.groundSignatures
                  .map(
                    (profile) =>
                      `${t(`ores.method.${profile.method}`)} ${profile.signatureValue ?? ""}`,
                  )
                  .join(" · ")
              : t("compare.noData")}
          </Row>

          <Row label={t("compare.bestRaw")}>
            <span className="font-mono">
              {column.bestRawSell === null ? (
                t("compare.noData")
              ) : (
                <AnimatedNumber value={column.bestRawSell} />
              )}
            </span>
          </Row>

          <Row label={t("compare.bestRefined")}>
            <span className="font-mono">
              {column.bestRefinedSell === null ? (
                t("compare.noData")
              ) : (
                <AnimatedNumber value={column.bestRefinedSell} />
              )}
            </span>
          </Row>

          <Row label={t("compare.topLocations")}>
            {column.topLocations.length === 0 ? (
              t("compare.noData")
            ) : (
              <span className="flex flex-col gap-1">
                {column.topLocations.map((location) => (
                  <span
                    key={`${location.systemCode}-${location.bodySlug}-${location.method}`}
                    className="flex items-baseline justify-between gap-2"
                  >
                    <GlowLink
                      href={`/locations/${location.systemCode.toLowerCase()}/${location.bodySlug}`}
                    >
                      {location.bodyName}
                    </GlowLink>
                    <span className="font-mono text-accent-secondary">
                      {location.probabilityPercent}%
                    </span>
                  </span>
                ))}
              </span>
            )}
          </Row>
        </article>
      ))}
    </div>
  );
}
