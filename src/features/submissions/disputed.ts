import type { Submission } from "./submissions.schema";

const DISPUTE_MIN_UPVOTES = 3;

/**
 * Bestehende Datensätze gelten als "umstritten", wenn eine offene
 * Korrektur-Submission gegen sie mindestens 3 Upvotes gesammelt hat
 * (CLAUDE.md §6.3: auch kuratierte Startdaten sind nicht unfehlbar).
 * Schlüsselformat: "ORECODE|methode".
 */
export function findDisputedKeys(submissions: Submission[]): Set<string> {
  const keys = new Set<string>();
  for (const submission of submissions) {
    if (
      submission.status === "pending" &&
      submission.targetKey !== null &&
      submission.votes.up >= DISPUTE_MIN_UPVOTES
    ) {
      keys.add(
        `${submission.targetKey.oreCode}|${submission.targetKey.method}`,
      );
    }
  }
  return keys;
}
