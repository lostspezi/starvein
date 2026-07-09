import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

/**
 * Erklärt die ROC/FPS-Signatur-Semantik (Größe statt Mineral) — bewusst
 * anders dargestellt als die Ship-Tabelle, damit keine falsche
 * 1:1-Erwartung wie beim Ship-Mining entsteht (CLAUDE.md §5).
 */
export function GroundSignatureExplainer({
  minerals,
}: {
  minerals: { code: string; name: string }[];
}) {
  const t = useTranslations("signatures");

  return (
    <div className="flex flex-col gap-4 rounded-lg border border-bg-nebula-2 bg-bg-nebula p-4">
      <p className="text-sm text-text-muted">{t("groundExplainer")}</p>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded border border-bg-nebula-2 bg-bg-void px-4 py-3">
          <span className="block font-mono text-2xl text-accent-secondary">
            3000
          </span>
          <span className="block text-sm text-text-muted">
            {t("groundFpsLabel")}
          </span>
        </div>
        <div className="rounded border border-bg-nebula-2 bg-bg-void px-4 py-3">
          <span className="block font-mono text-2xl text-accent-secondary">
            4000
          </span>
          <span className="block text-sm text-text-muted">
            {t("groundRocLabel")}
          </span>
        </div>
      </div>

      <div>
        <h3 className="mb-2 text-sm font-medium">{t("groundMineralsTitle")}</h3>
        <ul className="flex flex-wrap gap-2">
          {minerals.map((mineral) => (
            <li key={mineral.code}>
              <Link
                href={`/ores/${mineral.code.toLowerCase()}`}
                className="rounded bg-bg-nebula-2 px-2 py-1 text-sm text-accent-primary hover:text-accent-glow"
              >
                {mineral.name}
              </Link>
            </li>
          ))}
        </ul>
      </div>

      <p className="text-xs text-warning">{t("collisionNote")}</p>
    </div>
  );
}
