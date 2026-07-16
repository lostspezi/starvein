"use client";

import { BookmarkCheck } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";

/**
 * Toggle "Blueprint gesammelt". Rendert nichts für anonyme Nutzer —
 * Browsen bleibt ohne Account möglich, der Login wird nur fürs Speichern
 * gebraucht (CLAUDE.md §2/§8).
 */
export function CollectBlueprintButton({
  blueprintKey,
  initialIsCollected,
  isAuthenticated,
}: {
  blueprintKey: string;
  initialIsCollected: boolean;
  isAuthenticated: boolean;
}) {
  const t = useTranslations("blueprints.collect");
  const [isCollected, setIsCollected] = useState(initialIsCollected);
  const [busy, setBusy] = useState(false);

  if (!isAuthenticated) {
    return null;
  }

  async function toggle() {
    if (busy) return;
    setBusy(true);
    try {
      const response = await fetch("/api/blueprint-collection", {
        method: isCollected ? "DELETE" : "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ blueprintKey }),
      });
      if (response.ok) {
        setIsCollected(!isCollected);
      }
    } finally {
      setBusy(false);
    }
  }

  const label = t(isCollected ? "remove" : "add");

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={isCollected}
      aria-label={label}
      title={label}
      className={`inline-flex items-center gap-2 rounded px-2 py-1 text-sm leading-none transition-colors duration-150 ${
        isCollected
          ? "text-success hover:text-text-muted"
          : "text-text-muted hover:text-success"
      }`}
    >
      <BookmarkCheck
        aria-hidden="true"
        className="size-5"
        fill={isCollected ? "currentColor" : "none"}
      />
      {isCollected ? t("collected") : null}
    </button>
  );
}
