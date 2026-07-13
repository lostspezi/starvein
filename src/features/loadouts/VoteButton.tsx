"use client";

import { ArrowBigUp } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { signIn, useSession } from "@/lib/auth-client";
import { cn } from "@/lib/cn";

/**
 * Upvote-Toggle für öffentliche Loadouts. Ausgeloggte Nutzer werden zum
 * Discord-Login geschickt (Browsen bleibt frei, nur Voten braucht Account),
 * Owner sehen nur den Zähler — eigene Loadouts sind nicht votebar.
 */
export function VoteButton({
  loadoutId,
  initialVotes,
  initialHasVoted,
  isOwner,
}: {
  loadoutId: string;
  initialVotes: number;
  initialHasVoted: boolean;
  isOwner: boolean;
}) {
  const t = useTranslations("loadouts.vote");
  const { data: session } = useSession();
  const [votes, setVotes] = useState(initialVotes);
  const [hasVoted, setHasVoted] = useState(initialHasVoted);
  const [busy, setBusy] = useState(false);

  if (isOwner) {
    return (
      <span className="flex items-center gap-1 text-sm text-text-muted">
        <ArrowBigUp aria-hidden="true" className="size-4" />
        <span className="font-mono">{votes}</span>
      </span>
    );
  }

  async function toggle() {
    if (!session) {
      signIn.social({
        provider: "discord",
        callbackURL: window.location.pathname,
      });
      return;
    }
    if (busy) return;
    setBusy(true);
    try {
      const response = await fetch(`/api/loadouts/${loadoutId}/vote`, {
        method: "POST",
      });
      if (response.ok) {
        const data: { votes: { up: number }; hasVoted: boolean } =
          await response.json();
        setVotes(data.votes.up);
        setHasVoted(data.hasVoted);
      }
    } finally {
      setBusy(false);
    }
  }

  const label = session
    ? t(hasVoted ? "removeVote" : "upvote")
    : t("signInToVote");

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={hasVoted}
      aria-label={label}
      title={label}
      className={cn(
        "flex items-center gap-1 rounded px-2 py-1 text-sm transition-colors duration-150",
        hasVoted
          ? "text-accent-cyan"
          : "text-text-muted hover:text-text-primary",
      )}
    >
      <ArrowBigUp
        aria-hidden="true"
        className="size-4"
        fill={hasVoted ? "currentColor" : "none"}
      />
      <span className="font-mono">{votes}</span>
    </button>
  );
}
