"use client";

import { ChevronDown, ChevronUp } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import {
  MINING_METHODS,
  type MiningMethod,
  type Ore,
} from "@/features/ores/ores.schema";
import { Badge } from "@/lib/components/ui/Badge";
import { Button } from "@/lib/components/ui/Button";
import { Panel } from "@/lib/components/ui/Panel";
import type { Submission } from "./submissions.schema";

/**
 * Community-Vorschläge einer Location: Liste offener Submissions mit
 * Up-/Downvote (nur eingeloggt) plus Einreichen-Formular. Ob ein
 * Vorschlag Korrektur oder Neuanlage ist, entscheidet der Server.
 */
export function SubmissionsPanel({
  systemCode,
  bodySlug,
  initialSubmissions,
  ores,
  isAuthenticated,
}: {
  systemCode: string;
  bodySlug: string;
  initialSubmissions: Submission[];
  ores: Ore[];
  isAuthenticated: boolean;
}) {
  const t = useTranslations("submissions");
  const tOres = useTranslations("ores");
  const [submissions, setSubmissions] = useState(initialSubmissions);
  const [oreCode, setOreCode] = useState(ores[0]?.code ?? "");
  const [method, setMethod] = useState<MiningMethod>("ship");
  const [probability, setProbability] = useState("50");
  const [busy, setBusy] = useState(false);

  async function refresh() {
    const response = await fetch(
      `/api/submissions?system=${systemCode}&body=${bodySlug}`,
    );
    if (response.ok) {
      setSubmissions(await response.json());
    }
  }

  async function vote(submissionId: string, value: 1 | -1) {
    if (busy) return;
    setBusy(true);
    try {
      await fetch("/api/submissions/vote", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ submissionId, value }),
      });
      await refresh();
    } finally {
      setBusy(false);
    }
  }

  async function submitProposal(event: React.FormEvent) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    try {
      await fetch("/api/submissions", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          oreCode,
          systemCode,
          bodySlug,
          method: effectiveMethod,
          probabilityPercent: Number(probability),
        }),
      });
      await refresh();
    } finally {
      setBusy(false);
    }
  }

  const selectedOre = ores.find((ore) => ore.code === oreCode);
  const availableMethods = MINING_METHODS.filter(
    (m) => !selectedOre || selectedOre.mineableBy[m],
  );
  const effectiveMethod = availableMethods.includes(method)
    ? method
    : (availableMethods[0] ?? "ship");

  return (
    <Panel variant="glass" className="flex flex-col gap-3 p-4">
      <h2 className="text-lg font-medium">{t("title")}</h2>

      {submissions.length === 0 ? (
        <p className="text-sm text-text-muted">{t("empty")}</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {submissions.map((submission) => (
            <li
              key={submission.id}
              className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded border border-bg-nebula-2 bg-bg-void px-3 py-2 text-sm"
            >
              <span className="font-mono">
                {submission.proposedChange.oreCode}
              </span>
              <span>{tOres(`method.${submission.proposedChange.method}`)}</span>
              <span className="font-mono text-accent-secondary">
                {submission.proposedChange.probabilityPercent}%
              </span>
              <Badge tone="warning">
                {t(
                  submission.targetKey === null
                    ? "badge.new"
                    : "badge.correction",
                )}
              </Badge>
              <span className="text-xs text-text-muted">
                {t("votes", {
                  up: submission.votes.up,
                  down: submission.votes.down,
                })}
              </span>
              {isAuthenticated && (
                <span className="ml-auto flex gap-1">
                  <button
                    type="button"
                    aria-label={t("upvote")}
                    title={t("upvote")}
                    onClick={() => vote(submission.id, 1)}
                    className="rounded px-2 py-0.5 text-success transition-colors duration-150 hover:bg-bg-nebula-2"
                  >
                    <ChevronUp aria-hidden="true" className="size-4" />
                  </button>
                  <button
                    type="button"
                    aria-label={t("downvote")}
                    title={t("downvote")}
                    onClick={() => vote(submission.id, -1)}
                    className="rounded px-2 py-0.5 text-warning transition-colors duration-150 hover:bg-bg-nebula-2"
                  >
                    <ChevronDown aria-hidden="true" className="size-4" />
                  </button>
                </span>
              )}
            </li>
          ))}
        </ul>
      )}

      {isAuthenticated ? (
        <form
          onSubmit={submitProposal}
          className="flex flex-col gap-2 sm:flex-row sm:items-end"
        >
          <label className="flex flex-col gap-1 text-sm">
            {t("form.ore")}
            <select
              value={oreCode}
              onChange={(event) => setOreCode(event.target.value)}
              className="rounded border border-bg-nebula-2 bg-bg-void px-2 py-1.5"
            >
              {ores.map((ore) => (
                <option key={ore.code} value={ore.code}>
                  {ore.name_en} ({ore.code})
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm">
            {t("form.method")}
            <select
              value={effectiveMethod}
              onChange={(event) =>
                setMethod(event.target.value as MiningMethod)
              }
              className="rounded border border-bg-nebula-2 bg-bg-void px-2 py-1.5"
            >
              {availableMethods.map((m) => (
                <option key={m} value={m}>
                  {tOres(`method.${m}`)}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm">
            {t("form.probability")}
            <input
              type="number"
              min={0}
              max={100}
              value={probability}
              onChange={(event) => setProbability(event.target.value)}
              className="w-24 rounded border border-bg-nebula-2 bg-bg-void px-2 py-1.5"
            />
          </label>
          <Button type="submit" disabled={busy}>
            {t("form.submit")}
          </Button>
        </form>
      ) : (
        <p className="text-sm text-text-muted">{t("loginHint")}</p>
      )}
    </Panel>
  );
}
