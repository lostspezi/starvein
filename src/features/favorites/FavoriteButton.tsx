"use client";

import { Star } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";

/**
 * Stern-Toggle zum Speichern einer Location als Favorit.
 * Rendert nichts für anonyme Nutzer — Browsen bleibt ohne Account möglich,
 * der Login wird nur fürs Speichern gebraucht (CLAUDE.md §2/§8).
 */
export function FavoriteButton({
  systemCode,
  bodySlug,
  initialIsFavorite,
  isAuthenticated,
}: {
  systemCode: string;
  bodySlug: string;
  initialIsFavorite: boolean;
  isAuthenticated: boolean;
}) {
  const t = useTranslations("favorites");
  const [isFavorite, setIsFavorite] = useState(initialIsFavorite);
  const [busy, setBusy] = useState(false);

  if (!isAuthenticated) {
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
