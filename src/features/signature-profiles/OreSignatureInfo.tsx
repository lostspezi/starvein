import { useFormatter, useTranslations } from "next-intl";
import { Panel } from "@/lib/components/ui/Panel";
import { signatureClusters } from "./signature-cluster";
import type { SignatureProfile } from "./signature-profiles.schema";

function formatSignature(profile: SignatureProfile): string {
  if (profile.signatureValue !== undefined) {
    return String(profile.signatureValue);
  }
  return `${profile.signatureRange?.min}–${profile.signatureRange?.max}`;
}

/**
 * Signatur-Block auf der Erz-Detailseite. Ship-Profile zeigen den
 * Mineral-Signaturwert samt Kompositionsfenster; ROC/FPS-Profile zeigen
 * die größenbasierten Werte mit dem Hinweis, dass sie das Mineral NICHT
 * identifizieren (CLAUDE.md §5).
 */
export function OreSignatureInfo({
  profiles,
}: {
  profiles: SignatureProfile[];
}) {
  const t = useTranslations();
  const format = useFormatter();

  if (profiles.length === 0) {
    return null;
  }

  const ship = profiles.find((p) => p.method === "ship");
  const ground = profiles.filter((p) => p.method !== "ship");

  return (
    <Panel variant="glass" className="flex flex-col gap-3 p-4">
      <h2 className="text-lg font-medium">{t("signatures.oreInfoTitle")}</h2>

      {ship && (
        <div className="flex flex-wrap items-baseline gap-x-6 gap-y-1">
          <span>
            <span className="mr-2 text-sm text-text-muted">
              {t("signatures.table.signature")}
            </span>
            <span className="font-mono text-xl text-accent-secondary">
              {formatSignature(ship)}
            </span>
          </span>
          {ship.dominantCompositionRange && (
            <span>
              <span className="mr-2 text-sm text-text-muted">
                {t("signatures.table.composition")}
              </span>
              <span className="font-mono">
                {ship.dominantCompositionRange.min}–
                {ship.dominantCompositionRange.max}%
              </span>
            </span>
          )}
          {ship.notes && (
            <span className="text-sm text-text-muted">{ship.notes}</span>
          )}
        </div>
      )}

      {ship?.signatureValue !== undefined && (
        // Der In-Game-Scanner zeigt die Summe des Clusters (Basis × Rocks)
        <p className="text-sm text-text-muted">
          {t("signatures.oreClusterHint", {
            x2: format.number(signatureClusters(ship)[1].value!),
            x3: format.number(signatureClusters(ship)[2].value!),
            x4: format.number(signatureClusters(ship)[3].value!),
          })}
        </p>
      )}

      {ground.length > 0 && (
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap gap-4">
            {ground.map((profile) => (
              <span key={profile.method}>
                <span className="mr-2 text-sm text-text-muted">
                  {t(`ores.method.${profile.method}`)}
                </span>
                <span className="font-mono text-xl text-accent-secondary">
                  {formatSignature(profile)}
                </span>
              </span>
            ))}
          </div>
          <p className="text-sm text-warning">
            {t("signatures.oreGroundNote")}
          </p>
        </div>
      )}
    </Panel>
  );
}
