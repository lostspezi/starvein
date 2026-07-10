"use client";

import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { Button } from "@/lib/components/ui/Button";
import {
  DataTable,
  DataTableHead,
  DataTableRow,
  DataTableTd,
  DataTableTh,
} from "@/lib/components/ui/DataTable";
import type { ChatTimeout } from "./timeouts.repository";

/** Aktive Chat-Stummschaltungen mit Aufheben-Aktion fürs Admin-Panel. */
export function AdminTimeoutsTable({ timeouts }: { timeouts: ChatTimeout[] }) {
  const t = useTranslations("admin");
  const locale = useLocale();
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  if (timeouts.length === 0) {
    return <p className="text-sm text-text-muted">{t("noTimeouts")}</p>;
  }

  async function revoke(userId: string) {
    if (busyId) return;
    setBusyId(userId);
    setFailed(false);
    try {
      const response = await fetch(`/api/chat/timeouts/${userId}`, {
        method: "DELETE",
      });
      if (response.ok) {
        router.refresh();
      } else {
        setFailed(true);
      }
    } catch {
      setFailed(true);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-2">
      <DataTable>
        <DataTableHead>
          <DataTableTh>{t("columns.name")}</DataTableTh>
          <DataTableTh>{t("columns.until")}</DataTableTh>
          <DataTableTh>{t("columns.actions")}</DataTableTh>
        </DataTableHead>
        <tbody>
          {timeouts.map((timeout) => (
            <DataTableRow key={timeout.userId}>
              <DataTableTd className="text-text-primary">
                {timeout.userName}
              </DataTableTd>
              <DataTableTd className="font-mono text-xs">
                {new Date(timeout.until).toLocaleString(locale)}
              </DataTableTd>
              <DataTableTd>
                <Button
                  variant="ghost"
                  disabled={busyId !== null}
                  onClick={() => revoke(timeout.userId)}
                  className="border border-glass-border px-2 py-1 text-xs"
                >
                  {t("revoke")}
                </Button>
              </DataTableTd>
            </DataTableRow>
          ))}
        </tbody>
      </DataTable>
      {failed && (
        <p role="status" className="text-xs text-warning">
          {t("error")}
        </p>
      )}
    </div>
  );
}
