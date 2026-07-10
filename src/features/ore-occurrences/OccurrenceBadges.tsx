import { useTranslations } from "next-intl";
import { AnimatedNumber } from "@/lib/components/ui/AnimatedNumber";
import { Badge } from "@/lib/components/ui/Badge";
import type { OreOccurrence } from "./ore-occurrences.schema";

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

export function ProbabilityCell({ percent }: { percent: number }) {
  return (
    <AnimatedNumber
      value={percent}
      suffix="%"
      className="font-mono text-accent-secondary"
    />
  );
}
