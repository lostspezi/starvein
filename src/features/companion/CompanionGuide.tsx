import { useTranslations } from "next-intl";
import { Badge } from "@/lib/components/ui/Badge";
import { Panel } from "@/lib/components/ui/Panel";
import {
  COMPANION_RELEASES_URL,
  COMPANION_VERSION,
  GITHUB_BUG_URL,
} from "@/lib/site-config";
import {
  ConfirmIllustration,
  HotkeyIllustration,
  LoginIllustration,
  NotifyIllustration,
} from "./StepIllustration";

const STEP_ILLUSTRATIONS = [
  LoginIllustration,
  HotkeyIllustration,
  ConfirmIllustration,
  NotifyIllustration,
] as const;

const STEP_KEYS = ["login", "hotkey", "confirm", "track"] as const;

/**
 * Landing-/Anleitungsseite des Desktop-Companions: Beta-Download,
 * Vier-Schritte-Anleitung mit stilisierten HUD-Illustrationen und
 * Sicherheits-/Anforderungshinweise.
 */
export function CompanionGuide() {
  const t = useTranslations("companion");

  return (
    <div className="flex flex-col gap-10">
      {/* Hero mit Download */}
      <section className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <Badge tone="warning">
            {t("betaBadge", { version: COMPANION_VERSION })}
          </Badge>
          <span className="text-text-muted text-sm">{t("platform")}</span>
        </div>
        <p className="text-text-muted max-w-2xl">{t("intro")}</p>
        <div className="flex flex-wrap items-center gap-4">
          <a
            href={COMPANION_RELEASES_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="bg-accent-primary text-bg-void hover:bg-accent-glow hover:shadow-glow-primary rounded px-5 py-2.5 text-sm font-medium transition-all duration-200"
          >
            {t("download")}
          </a>
          <span className="text-text-muted text-xs">
            {t("smartscreenHint")}
          </span>
        </div>
      </section>

      {/* Schritt-für-Schritt-Anleitung */}
      <section className="flex flex-col gap-4">
        <h2 className="text-accent-ice text-lg font-medium">{t("howTitle")}</h2>
        <ol className="grid gap-6 sm:grid-cols-2">
          {STEP_KEYS.map((key, index) => {
            const Illustration = STEP_ILLUSTRATIONS[index];
            return (
              <li key={key}>
                <Panel
                  variant="glass"
                  className="flex h-full flex-col gap-3 p-4"
                >
                  <Illustration label={t(`steps.${key}.title`)} />
                  <div>
                    <h3 className="text-text-primary text-sm font-medium">
                      <span className="text-accent-cyan mr-2 font-mono">
                        {index + 1}
                      </span>
                      {t(`steps.${key}.title`)}
                    </h3>
                    <p className="text-text-muted mt-1 text-sm">
                      {t(`steps.${key}.body`)}
                    </p>
                  </div>
                </Panel>
              </li>
            );
          })}
        </ol>
      </section>

      {/* Sicherheit & Anforderungen */}
      <section className="grid gap-4 sm:grid-cols-2">
        <Panel variant="glass" className="p-4">
          <h2 className="text-text-primary mb-2 text-sm font-medium">
            {t("safetyTitle")}
          </h2>
          <p className="text-text-muted text-sm">{t("safetyBody")}</p>
        </Panel>
        <Panel variant="glass" className="p-4">
          <h2 className="text-text-primary mb-2 text-sm font-medium">
            {t("requirementsTitle")}
          </h2>
          <ul className="text-text-muted list-inside list-disc text-sm">
            <li>{t("requirements.windows")}</li>
            <li>{t("requirements.discord")}</li>
            <li>{t("requirements.game")}</li>
          </ul>
        </Panel>
      </section>

      <p className="text-text-muted text-sm">
        {t("feedbackPrefix")}{" "}
        <a
          href={GITHUB_BUG_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="text-accent-primary hover:text-accent-glow transition-colors duration-150"
        >
          {t("feedbackLink")}
        </a>
      </p>
    </div>
  );
}
