import { useTranslations } from "next-intl";
import type { DepositPanelData } from "@/features/signature-profiles/SignatureClusterPanel";
import { AnimatedNumber } from "@/lib/components/ui/AnimatedNumber";
import { Badge } from "@/lib/components/ui/Badge";
import type { DepositType, OreOccurrence } from "./ore-occurrences.schema";

/**
 * Mappt die Deposit-Felder einer Occurrence auf die serialisierbaren
 * Panel-Props des Aufklapp-Panels (gemeinsam für alle Vorkommen-Tabellen).
 * Explorer-Rows kommen ohne rockBreakdown (Payload-Gewicht) — das Panel
 * zeigt dann nur die Beiprodukt-Beziehung.
 */
export function toDepositPanelData(
  occurrence: Pick<
    OreOccurrence,
    "depositType" | "byproductOf" | "rockBreakdown"
  >,
): DepositPanelData | undefined {
  if (!occurrence.depositType) return undefined;
  return {
    type: occurrence.depositType,
    byproductOf: occurrence.byproductOf ?? [],
    rocks: occurrence.rockBreakdown ?? [],
  };
}

/** Status-Badge: unbestätigt (niedrige Konfidenz) vs. bestätigt. */
export function ConfidenceBadge({
  occurrence,
}: {
  occurrence: Pick<OreOccurrence, "confidenceScore">;
}) {
  const t = useTranslations("occurrences");
  const verified = occurrence.confidenceScore >= 0.7;

  return (
    <Badge tone={verified ? "success" : "warning"}>
      {t(verified ? "badge.verified" : "badge.unverified")}
    </Badge>
  );
}

/**
 * Haupt-/Nebenvorkommen-Badge. Ohne depositType (Alt-Docs, unbekannte
 * Wiki-Gruppen) wird nichts gerendert — defensiv statt falsch.
 */
export function DepositBadge({ depositType }: { depositType?: DepositType }) {
  const t = useTranslations("occurrences");
  if (!depositType) return null;

  return (
    <Badge tone={depositType === "primary" ? "success" : "warning"}>
      {t(`deposit.${depositType}`)}
    </Badge>
  );
}

export function ProbabilityCell({ percent }: { percent: number }) {
  return (
    <AnimatedNumber
      value={percent}
      suffix="%"
      className="font-mono text-accent-secondary"
    />
  );
}
