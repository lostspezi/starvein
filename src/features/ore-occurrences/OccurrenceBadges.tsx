import { useTranslations } from "next-intl";
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
    <span
      className={
        verified
          ? "rounded bg-bg-nebula-2 px-1.5 py-0.5 text-xs text-success"
          : "rounded bg-bg-nebula-2 px-1.5 py-0.5 text-xs text-warning"
      }
    >
      {t(verified ? "badge.verified" : "badge.unverified")}
    </span>
  );
}

export function ProbabilityCell({ percent }: { percent: number }) {
  return <span className="font-mono text-accent-secondary">{percent}%</span>;
}
