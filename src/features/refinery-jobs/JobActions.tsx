"use client";

import { Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { Button } from "@/lib/components/ui/Button";

/** Löschen eines eigenen Jobs mit Bestätigung. */
export function JobActions({ jobId }: { jobId: string }) {
  const t = useTranslations("refineryJobs.actions");
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function remove() {
    if (busy || !window.confirm(t("confirmDelete"))) return;
    setBusy(true);
    try {
      const response = await fetch(`/api/refinery-jobs/${jobId}`, {
        method: "DELETE",
      });
      if (response.ok) router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
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
  );
}
