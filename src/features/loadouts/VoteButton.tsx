"use client";

import { VoteButton as SharedVoteButton } from "@/lib/components/VoteButton";

/** Upvote-Toggle für öffentliche Loadouts (siehe lib/components/VoteButton). */
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
  return (
    <SharedVoteButton
      endpoint={`/api/loadouts/${loadoutId}/vote`}
      labelNamespace="loadouts.vote"
      initialVotes={initialVotes}
      initialHasVoted={initialHasVoted}
      isOwner={isOwner}
    />
  );
}
