"use client";

import { useState } from "react";
import { useFormatter, useTranslations } from "next-intl";
import { cn } from "@/lib/cn";
import { Button } from "@/lib/components/ui/Button";
import { panelClasses } from "@/lib/components/ui/Panel";
import type { AdminApiKeyEntry } from "./admin-api-keys.service";
import { KeyStatsPanel } from "./KeyStatsPanel";

/**
 * Admin-Übersicht aller API-Keys: Owner, Nutzungssumme, Statistiken
 * (nie Key-Material), Key-Löschung und Erstellungs-Sperre pro Nutzer.
 */
export function AdminApiKeysTable({
  initialEntries,
}: {
  initialEntries: AdminApiKeyEntry[];
}) {
  const t = useTranslations("apiKeys.admin");
  const format = useFormatter();
  const [entries, setEntries] = useState(initialEntries);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [statsOpenId, setStatsOpenId] = useState<string | null>(null);

  async function handleDelete(keyId: string) {
    setConfirmingId(null);
    const response = await fetch(`/api/admin/api-keys/${keyId}`, {
      method: "DELETE",
    });
    if (response.ok) {
      setEntries((previous) => previous.filter((row) => row.id !== keyId));
    }
  }

  async function handleBanToggle(ownerId: string, banned: boolean) {
    const response = await fetch(`/api/admin/users/${ownerId}/api-key-ban`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ banned }),
    });
    if (response.ok) {
      setEntries((previous) =>
        previous.map((row) =>
          row.owner.id === ownerId
            ? { ...row, owner: { ...row.owner, banned } }
            : row,
        ),
      );
    }
  }

  function formatDay(iso: string | null): string {
    if (!iso) return t("neverUsed");
    return format.dateTime(new Date(iso), {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  }

  if (entries.length === 0) {
    return <p className="text-text-muted">{t("empty")}</p>;
  }

  return (
    <ul className="space-y-3">
      {entries.map((row) => (
        <li key={row.id} className={cn(panelClasses(), "overflow-hidden")}>
          <div className="flex flex-col gap-3 p-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0">
              <div className="truncate font-medium text-text-primary">
                {row.name}
              </div>
              <div className="font-mono text-sm text-text-muted">
                {row.start}…
              </div>
              <div className="mt-1 text-xs text-text-muted">
                {t("owner")}:{" "}
                <span
                  className={cn(
                    "text-text-primary",
                    row.owner.banned && "text-warning",
                  )}
                >
                  {row.owner.name || row.owner.id}
                </span>
                {row.owner.banned && ` (${t("bannedBadge")})`} ·{" "}
                {t("createdAt")}: {formatDay(row.createdAt)} · {t("lastUsedAt")}
                : {formatDay(row.lastUsedAt)}
              </div>
            </div>
            <div className="flex shrink-0 flex-wrap items-center gap-2">
              <span className="font-mono text-sm text-accent-secondary">
                {format.number(row.totalRequests)}{" "}
                <span className="text-xs text-text-muted">{t("requests")}</span>
              </span>
              <Button
                variant="ghost"
                aria-expanded={statsOpenId === row.id}
                onClick={() =>
                  setStatsOpenId((current) =>
                    current === row.id ? null : row.id,
                  )
                }
              >
                {t("stats")}
              </Button>
              <Button
                variant="ghost"
                onClick={() =>
                  void handleBanToggle(row.owner.id, !row.owner.banned)
                }
              >
                {row.owner.banned ? t("unban") : t("ban")}
              </Button>
              {confirmingId === row.id ? (
                <>
                  <Button variant="ghost" onClick={() => setConfirmingId(null)}>
                    {t("deleteCancel")}
                  </Button>
                  <Button onClick={() => void handleDelete(row.id)}>
                    {t("deleteConfirm")}
                  </Button>
                </>
              ) : (
                <Button variant="ghost" onClick={() => setConfirmingId(row.id)}>
                  {t("delete")}
                </Button>
              )}
            </div>
          </div>
          {confirmingId === row.id && (
            <p className="px-4 pb-3 text-sm text-warning">
              {t("deleteWarning", { name: row.name, owner: row.owner.name })}
            </p>
          )}
          {statsOpenId === row.id && (
            <div className="border-t border-bg-nebula-2">
              <KeyStatsPanel
                keyId={row.id}
                statsBasePath="/api/admin/api-keys"
              />
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}
