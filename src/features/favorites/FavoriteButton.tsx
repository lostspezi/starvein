"use client";

import { Star } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { useSession } from "@/lib/auth-client";

/**
 * Stern-Toggle zum Speichern einer Location als Favorit.
 * Rendert nichts für anonyme Nutzer — Browsen bleibt ohne Account möglich,
 * der Login wird nur fürs Speichern gebraucht (CLAUDE.md §2/§8).
 *
 * Zwei Betriebsarten:
 * - Server-personalisiert (Home-Explorer): initialIsFavorite/isAuthenticated
 *   kommen als Props von einer dynamisch gerenderten Seite.
 * - Self-managed (ISR-Seiten wie die Body-Detailseite): ohne diese Props
 *   ermittelt der Button Session und Favoriten-Zustand clientseitig —
 *   der State "poppt" nach der Hydration ein, dafür bleibt die Seite cachebar.
 */
export function FavoriteButton({
  systemCode,
  bodySlug,
  initialIsFavorite,
  isAuthenticated,
}: {
  systemCode: string;
  bodySlug: string;
  initialIsFavorite?: boolean;
  isAuthenticated?: boolean;
}) {
  const t = useTranslations("favorites");
  const selfManaged = isAuthenticated === undefined;
  const { data: session } = useSession();
  const [isFavorite, setIsFavorite] = useState(initialIsFavorite ?? false);
  const [busy, setBusy] = useState(false);

  const sessionUserId = session?.user?.id ?? null;
  const authenticated = selfManaged ? sessionUserId !== null : isAuthenticated;

  useEffect(() => {
    if (!selfManaged || sessionUserId === null) return;
    let cancelled = false;
    void (async () => {
      const response = await fetch("/api/favorites");
      if (!response.ok || cancelled) return;
      const favorites: { systemCode: string; bodySlug: string }[] =
        await response.json();
      if (cancelled) return;
      setIsFavorite(
        favorites.some(
          (f) => f.systemCode === systemCode && f.bodySlug === bodySlug,
        ),
      );
    })();
    return () => {
      cancelled = true;
    };
  }, [selfManaged, sessionUserId, systemCode, bodySlug]);

  if (!authenticated) {
    return null;
  }

  async function toggle() {
    if (busy) return;
    setBusy(true);
    try {
      const response = await fetch("/api/favorites", {
        method: isFavorite ? "DELETE" : "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ systemCode, bodySlug }),
      });
      if (response.ok) {
        setIsFavorite(!isFavorite);
      }
    } finally {
      setBusy(false);
    }
  }

  const label = t(isFavorite ? "remove" : "add");

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={isFavorite}
      aria-label={label}
      title={label}
      className={`rounded px-2 py-1 leading-none transition-colors duration-150 ${
        isFavorite
          ? "text-warning hover:text-text-muted"
          : "text-text-muted hover:text-warning"
      }`}
    >
      <Star
        aria-hidden="true"
        className="size-5"
        fill={isFavorite ? "currentColor" : "none"}
      />
    </button>
  );
}
