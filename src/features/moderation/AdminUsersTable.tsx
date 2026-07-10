"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { Badge } from "@/lib/components/ui/Badge";
import { Button } from "@/lib/components/ui/Button";
import {
  DataTable,
  DataTableHead,
  DataTableRow,
  DataTableTd,
  DataTableTh,
} from "@/lib/components/ui/DataTable";
import type { AssignableRole } from "./roles";
import type { AdminUserListEntry } from "./users.repository";

/**
 * Rollen-Verwaltung fürs Admin-Panel. Admin-Zeilen und die eigene Zeile
 * haben keine Aktionen — die API blockt das ohnehin (Last-Admin-Schutz),
 * hier verschwinden die Buttons zusätzlich aus dem UI.
 */
export function AdminUsersTable({
  users,
  currentUserId,
}: {
  users: AdminUserListEntry[];
  currentUserId: string;
}) {
  const t = useTranslations("admin");
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  async function changeRole(userId: string, role: AssignableRole) {
    if (busyId) return;
    setBusyId(userId);
    setFailed(false);
    try {
      const response = await fetch(`/api/admin/users/${userId}/role`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ role }),
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
          <DataTableTh>{t("columns.role")}</DataTableTh>
          <DataTableTh>{t("columns.actions")}</DataTableTh>
        </DataTableHead>
        <tbody>
          {users.map((user) => {
            const untouchable =
              user.role === "admin" || user.id === currentUserId;
            return (
              <DataTableRow key={user.id}>
                <DataTableTd className="text-text-primary">
                  {user.name}
                </DataTableTd>
                <DataTableTd>
                  <Badge tone={user.role === "user" ? "default" : "success"}>
                    {t(`roles.${user.role}`)}
                  </Badge>
                </DataTableTd>
                <DataTableTd>
                  {!untouchable && (
                    <Button
                      variant="ghost"
                      disabled={busyId !== null}
                      onClick={() =>
                        changeRole(
                          user.id,
                          user.role === "moderator" ? "user" : "moderator",
                        )
                      }
                      className="border border-glass-border px-2 py-1 text-xs"
                    >
                      {user.role === "moderator" ? t("demote") : t("promote")}
                    </Button>
                  )}
                </DataTableTd>
              </DataTableRow>
            );
          })}
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
