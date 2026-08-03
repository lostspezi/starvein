"use client";

import { useState } from "react";
import { useFormatter, useTranslations } from "next-intl";
import { cn } from "@/lib/cn";
import { Button } from "@/lib/components/ui/Button";
import { panelClasses } from "@/lib/components/ui/Panel";
import type { ApiKeySummary, CreatedApiKey } from "./api-keys.schema";
import { KeyStatsPanel } from "./KeyStatsPanel";
import { ShowOnceModal } from "./ShowOnceModal";

/**
 * Key-Verwaltung: Erstellen (Show-once-Modal), Liste mit start-Fragment,
 * Widerruf mit Bestätigung, aufklappbare Nutzungs-Statistik pro Key.
 */
export function ApiKeysManager({
  initialKeys,
}: {
  initialKeys: ApiKeySummary[];
}) {
  const t = useTranslations("apiKeys");
  const format = useFormatter();
  const [keys, setKeys] = useState(initialKeys);
  const [name, setName] = useState("");
  const [pending, setPending] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [freshKey, setFreshKey] = useState<CreatedApiKey | null>(null);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [statsOpenId, setStatsOpenId] = useState<string | null>(null);

  async function handleCreate(event: React.FormEvent) {
    event.preventDefault();
    if (!name.trim() || pending) return;
    setPending(true);
    setCreateError(null);
    try {
      const response = await fetch("/api/account/api-keys", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: name.trim() }),
      });
      if (response.status === 403) {
        const body = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;
        setCreateError(
          body?.error === "banned"
            ? t("create.banned")
            : t("create.limitReached"),
        );
        return;
      }
      if (!response.ok) {
        setCreateError(t("create.error"));
        return;
      }
      const created = (await response.json()) as CreatedApiKey;
      setFreshKey(created);
      setKeys((previous) => [
        {
          id: created.id,
          name: created.name,
          start: created.start,
          createdAt: created.createdAt,
          lastUsedAt: created.lastUsedAt,
        },
        ...previous,
      ]);
      setName("");
    } catch {
      setCreateError(t("create.error"));
    } finally {
      setPending(false);
    }
  }

  async function handleRevoke(keyId: string) {
    setConfirmingId(null);
    const response = await fetch(`/api/account/api-keys/${keyId}`, {
      method: "DELETE",
    });
    if (response.ok) {
      setKeys((previous) => previous.filter((key) => key.id !== keyId));
    }
  }

  function formatDay(iso: string | null): string {
    if (!iso) return t("list.neverUsed");
    return format.dateTime(new Date(iso), {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  }

  return (
    <div className="space-y-6">
      <p className="max-w-prose text-text-muted">{t("intro")}</p>

      <form
        onSubmit={handleCreate}
        className="flex flex-col gap-3 sm:flex-row sm:items-end"
      >
        <label className="flex flex-1 flex-col gap-1 text-sm">
          <span className="text-text-muted">{t("create.nameLabel")}</span>
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder={t("create.namePlaceholder")}
            maxLength={50}
            required
            className="rounded-lg border border-glass-border bg-bg-nebula px-3 py-2 text-text-primary outline-none transition-colors focus:border-accent-cyan"
          />
        </label>
        <Button type="submit" disabled={pending || !name.trim()}>
          {t("create.submit")}
        </Button>
      </form>
      {createError && <p className="text-sm text-warning">{createError}</p>}

      {keys.length === 0 ? (
        <p className="text-text-muted">{t("list.empty")}</p>
      ) : (
        <ul className="space-y-3">
          {keys.map((key) => (
            <li key={key.id} className={cn(panelClasses(), "overflow-hidden")}>
              <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <div className="truncate font-medium text-text-primary">
                    {key.name}
                  </div>
                  <div className="font-mono text-sm text-text-muted">
                    {key.start}…
                  </div>
                  <div className="mt-1 text-xs text-text-muted">
                    {t("list.createdAt")}: {formatDay(key.createdAt)} ·{" "}
                    {t("list.lastUsedAt")}: {formatDay(key.lastUsedAt)}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Button
                    variant="ghost"
                    aria-expanded={statsOpenId === key.id}
                    onClick={() =>
                      setStatsOpenId((current) =>
                        current === key.id ? null : key.id,
                      )
                    }
                  >
                    {t("list.stats")}
                  </Button>
                  {confirmingId === key.id ? (
                    <>
                      <Button
                        variant="ghost"
                        onClick={() => setConfirmingId(null)}
                      >
                        {t("list.revokeCancel")}
                      </Button>
                      <Button onClick={() => void handleRevoke(key.id)}>
                        {t("list.revoke")}
                      </Button>
                    </>
                  ) : (
                    <Button
                      variant="ghost"
                      onClick={() => setConfirmingId(key.id)}
                    >
                      {t("list.revoke")}
                    </Button>
                  )}
                </div>
              </div>
              {confirmingId === key.id && (
                <p className="px-4 pb-3 text-sm text-warning">
                  {t("list.revokeConfirm", { name: key.name })}
                </p>
              )}
              {statsOpenId === key.id && (
                <div className="border-t border-bg-nebula-2">
                  <KeyStatsPanel keyId={key.id} />
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      {freshKey && (
        <ShowOnceModal
          name={freshKey.name}
          fullKey={freshKey.key}
          onClose={() => setFreshKey(null)}
        />
      )}
    </div>
  );
}
