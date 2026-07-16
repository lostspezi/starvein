"use client";

import { VoteButton } from "@/lib/components/VoteButton";

/** Upvote-Toggle für öffentliche Guides (siehe VoteButton). */
export function GuideVoteButton({
  guideId,
  initialVotes,
  initialHasVoted,
  isOwner,
}: {
  guideId: string;
  initialVotes: number;
  initialHasVoted: boolean;
  isOwner: boolean;
}) {
  return (
    <VoteButton
      endpoint={`/api/guides/${guideId}/vote`}
      labelNamespace="guides.vote"
      initialVotes={initialVotes}
      initialHasVoted={initialHasVoted}
      isOwner={isOwner}
    />
  );
}
