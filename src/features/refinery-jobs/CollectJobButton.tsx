"use client";

import { PackageCheck } from "lucide-react";
import { useTranslations } from "next-intl";
import { useId, useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { Button } from "@/lib/components/ui/Button";
import { Panel } from "@/lib/components/ui/Panel";

const inputClass =
  "w-full rounded border border-bg-nebula-2 bg-bg-void px-3 py-1.5 text-sm transition-all duration-150 placeholder:text-text-muted focus:border-accent-primary focus:outline-none";

type CollectItem = {
  oreCode: string;
  oreName: string;
  quantityScu: number;
  qualityRating?: number;
};

/**
 * "Abholen"-Flow: expandiert ein Inline-Panel mit editierbaren
 * Output-Mengen (Prefill = Input-SCU) und optionaler Übernahme ins Lager
 * am Refinery-Terminal.
 */
export function CollectJobButton({
  jobId,
  items,
}: {
  jobId: string;
  items: CollectItem[];
}) {
  const t = useTranslations("refineryJobs.collect");
  const router = useRouter();
  const formId = useId();
  const [open, setOpen] = useState(false);
  const [transfer, setTransfer] = useState(true);
  const [quantities, setQuantities] = useState<string[]>(
    items.map((item) => String(item.quantityScu)),
  );
  const [qualities, setQualities] = useState<string[]>(
    items.map((item) =>
      item.qualityRating != null ? String(item.qualityRating) : "",
    ),
  );
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  const parsed = quantities.map(Number);
  const canConfirm =
    !busy && (!transfer || parsed.every((q) => Number.isFinite(q) && q > 0));

  async function confirm() {
    if (!canConfirm) return;
    setBusy(true);
    setFailed(false);
    try {
      const response = await fetch(`/api/refinery-jobs/${jobId}/collect`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(
          transfer
            ? {
                transfer: items.map((item, index) => ({
                  oreCode: item.oreCode,
                  quantityScu: parsed[index],
                  ...(qualities[index].trim() !== ""
                    ? { qualityRating: Number(qualities[index]) }
                    : {}),
                })),
              }
            : {},
        ),
      });
      if (!response.ok) {
        setFailed(true);
        return;
      }
      setOpen(false);
      router.refresh();
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <Button onClick={() => setOpen(true)}>
        <PackageCheck aria-hidden="true" className="size-4" />
        {t("cta")}
      </Button>
    );
  }

  return (
    <Panel variant="glass" className="flex w-full flex-col gap-3 p-4">
      <h3 className="text-sm font-medium">{t("heading")}</h3>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={transfer}
          onChange={(event) => setTransfer(event.target.checked)}
        />
        {t("transferLabel")}
      </label>
      {transfer && (
        <div className="flex flex-col gap-2">
          <p className="text-xs text-text-muted">{t("hint")}</p>
          <div className="flex flex-wrap gap-3">
            {items.map((item, index) => (
              <div key={item.oreCode} className="flex flex-col gap-1">
                <label
                  htmlFor={`${formId}-${item.oreCode}`}
                  className="text-xs text-text-muted"
                >
                  {t("quantityLabel", { ore: item.oreName })}
                </label>
                <input
                  id={`${formId}-${item.oreCode}`}
                  type="number"
                  min={0}
                  step="any"
                  value={quantities[index]}
                  onChange={(event) =>
                    setQuantities((current) =>
                      current.map((q, i) =>
                        i === index ? event.target.value : q,
                      ),
                    )
                  }
                  className={`${inputClass} w-32`}
                />
                <label
                  htmlFor={`${formId}-${item.oreCode}-quality`}
                  className="text-xs text-text-muted"
                >
                  {t("qualityLabel", { ore: item.oreName })}
                </label>
                <input
                  id={`${formId}-${item.oreCode}-quality`}
                  type="number"
                  min={0}
                  max={1000}
                  step={1}
                  value={qualities[index]}
                  onChange={(event) =>
                    setQualities((current) =>
                      current.map((q, i) =>
                        i === index ? event.target.value : q,
                      ),
                    )
                  }
                  className={`${inputClass} w-32`}
                />
              </div>
            ))}
          </div>
        </div>
      )}
      {failed && <p className="text-sm text-warning">{t("error")}</p>}
      <div className="flex flex-wrap gap-2">
        <Button disabled={!canConfirm} onClick={confirm}>
          {t("confirm")}
        </Button>
        <Button variant="ghost" disabled={busy} onClick={() => setOpen(false)}>
          {t("cancel")}
        </Button>
      </div>
    </Panel>
  );
}
