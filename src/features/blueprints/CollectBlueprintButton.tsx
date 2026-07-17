"use client";

import { BookmarkCheck } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { useSession } from "@/lib/auth-client";

/**
 * Toggle "Blueprint gesammelt". Rendert nichts für anonyme Nutzer —
 * Browsen bleibt ohne Account möglich, der Login wird nur fürs Speichern
 * gebraucht (CLAUDE.md §2/§8).
 *
 * Ohne initialIsCollected/isAuthenticated-Props ermittelt der Button
 * Session und Zustand selbst (self-managed) — so bleibt die
 * Blueprint-Detailseite ISR-cachebar (siehe FavoriteButton).
 */
export function CollectBlueprintButton({
  blueprintKey,
  initialIsCollected,
  isAuthenticated,
}: {
  blueprintKey: string;
  initialIsCollected?: boolean;
  isAuthenticated?: boolean;
}) {
  const t = useTranslations("blueprints.collect");
  const selfManaged = isAuthenticated === undefined;
  const { data: session } = useSession();
  const [isCollected, setIsCollected] = useState(initialIsCollected ?? false);
  const [busy, setBusy] = useState(false);

  const sessionUserId = session?.user?.id ?? null;
  const authenticated = selfManaged ? sessionUserId !== null : isAuthenticated;

  useEffect(() => {
    if (!selfManaged || sessionUserId === null) return;
    let cancelled = false;
    void (async () => {
      const response = await fetch("/api/blueprint-collection");
      if (!response.ok || cancelled) return;
      const entries: { blueprintKey: string }[] = await response.json();
      if (cancelled) return;
      setIsCollected(entries.some((e) => e.blueprintKey === blueprintKey));
    })();
    return () => {
      cancelled = true;
    };
  }, [selfManaged, sessionUserId, blueprintKey]);

  if (!authenticated) {
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
