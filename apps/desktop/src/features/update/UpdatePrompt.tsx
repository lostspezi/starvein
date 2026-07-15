import { useTranslations } from "use-intl";

/**
 * Start-Dialog des Auto-Updaters: fragt einmalig, ob die gefundene neue
 * Version installiert werden soll. "Später" lässt die App normal laufen —
 * der Check bleibt über die Einstellungen jederzeit erreichbar.
 */
export function UpdatePrompt({
  version,
  busy,
  onInstall,
  onDismiss,
}: {
  version: string;
  busy: boolean;
  onInstall: () => void;
  onDismiss: () => void;
}) {
  const t = useTranslations("update");

  return (
    <div
      role="alertdialog"
      aria-label={t("title")}
      className="border-glass-border bg-glass flex flex-wrap items-center gap-3 border-b px-4 py-3 backdrop-blur-md"
    >
      <p className="text-text-primary text-sm">{t("available", { version })}</p>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onInstall}
          disabled={busy}
          className="bg-accent-primary text-bg-void hover:shadow-glow-primary rounded px-3 py-1.5 text-xs font-medium transition-all duration-200 disabled:opacity-50"
        >
          {busy ? t("installing") : t("install")}
        </button>
        <button
          type="button"
          onClick={onDismiss}
          disabled={busy}
          className="text-text-muted hover:bg-bg-nebula-2 hover:text-text-primary rounded px-3 py-1.5 text-xs transition-colors duration-150 disabled:opacity-50"
        >
          {t("later")}
        </button>
      </div>
    </div>
  );
}
