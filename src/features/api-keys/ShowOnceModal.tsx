"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/cn";
import { Button } from "@/lib/components/ui/Button";
import { panelClasses } from "@/lib/components/ui/Panel";

type ShowOnceModalProps = {
  name: string;
  /** Das volle Key-Material — existiert nur in diesem Moment im Client. */
  fullKey: string;
  onClose: () => void;
};

/**
 * Zeigt einen frisch erstellten API-Key genau einmal an. Nach dem
 * Schließen ist serverseitig nur noch der Hash bekannt (Anzeige über
 * das start-Fragment).
 */
export function ShowOnceModal({ name, fullKey, onClose }: ShowOnceModalProps) {
  const t = useTranslations("apiKeys.showOnce");
  const [copied, setCopied] = useState(false);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t("title")}
      className="fixed inset-0 z-50 flex items-center justify-center bg-bg-void/80 p-4 backdrop-blur-sm"
    >
      <div
        className={cn(
          panelClasses({ variant: "glass" }),
          "w-full max-w-lg animate-reveal space-y-4 p-6",
        )}
      >
        <h2 className="text-lg font-semibold text-accent-ice">
          {t("title")} — {name}
        </h2>
        <p className="text-sm text-warning">{t("warning")}</p>
        <code className="block overflow-x-auto rounded-lg border border-glass-border bg-bg-nebula p-3 font-mono text-sm text-accent-secondary">
          {fullKey}
        </code>
        <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
          <Button
            onClick={() => {
              void navigator.clipboard
                ?.writeText(fullKey)
                .then(() => setCopied(true))
                .catch(() => {});
            }}
          >
            {copied ? t("copied") : t("copy")}
          </Button>
          <Button variant="ghost" onClick={onClose}>
            {t("close")}
          </Button>
        </div>
      </div>
    </div>
  );
}
