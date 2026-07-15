"use client";

import { Pencil, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { Link, useRouter } from "@/i18n/navigation";
import { Button } from "@/lib/components/ui/Button";

/**
 * Aktionen auf einem Guide. Der Owner darf bearbeiten, Sichtbarkeit
 * umschalten und löschen; ein Admin darf ausschließlich löschen (canEdit
 * false, canDelete true). Nach Mutationen wird die Server-Komponente per
 * router.refresh() aktualisiert.
 */
export function OwnerActions({
  guideId,
  isPublic,
  canEdit,
  canDelete,
}: {
  guideId: string;
  isPublic: boolean;
  canEdit: boolean;
  canDelete: boolean;
}) {
  const t = useTranslations("guides.mine");
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function toggleVisibility() {
    if (busy) return;
    setBusy(true);
    try {
      const response = await fetch(`/api/guides/${guideId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ isPublic: !isPublic }),
      });
      if (response.ok) router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (busy || !window.confirm(t("confirmDelete"))) return;
    setBusy(true);
    try {
      const response = await fetch(`/api/guides/${guideId}`, {
        method: "DELETE",
      });
      if (response.ok) {
        router.push(canEdit ? "/guides/mine" : "/guides");
        router.refresh();
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {canEdit && (
        <>
          <Link
            href={`/guides/${guideId}/edit`}
            className="flex items-center gap-1 rounded px-2 py-1 text-sm text-text-muted transition-colors duration-150 hover:bg-bg-nebula-2 hover:text-text-primary"
          >
            <Pencil aria-hidden="true" className="size-4" />
            {t("edit")}
          </Link>
          <Button variant="ghost" disabled={busy} onClick={toggleVisibility}>
            {t(isPublic ? "unpublish" : "publish")}
          </Button>
        </>
      )}
      {canDelete && (
        <Button
          variant="ghost"
          disabled={busy}
          onClick={remove}
          className="text-warning hover:text-warning"
          aria-label={t("delete")}
          title={t("delete")}
        >
          <Trash2 aria-hidden="true" className="size-4" />
        </Button>
      )}
    </div>
  );
}
