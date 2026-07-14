"use client";

import { Plus, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useId, useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { Button } from "@/lib/components/ui/Button";
import { Panel } from "@/lib/components/ui/Panel";
import { JOB_MAX_ITEMS } from "./refinery-jobs.schema";

const inputClass =
  "w-full rounded border border-bg-nebula-2 bg-bg-void px-3 py-1.5 text-sm transition-all duration-150 placeholder:text-text-muted focus:border-accent-primary focus:outline-none";

const selectClass =
  "rounded border border-bg-nebula-2 bg-bg-void px-2 py-1 text-sm focus:border-accent-primary focus:outline-none";

type TerminalOption = {
  terminalId: number;
  terminalName: string;
  starSystemName: string | null;
};
type MethodOption = {
  code: string;
  name: string;
  ratingYield: number;
  ratingCost: number;
  ratingSpeed: number;
};
type OreOption = { code: string; name: string };

type ItemRow = { oreCode: string; quantity: string };

/**
 * Formular zum Tracken eines neuen Raffinerie-Jobs: Terminal, Methode,
 * mehrere Erz-Positionen, Dauer als Stunden+Minuten (wie im Spiel
 * angezeigt), optional rückdatierter Start.
 */
export function RefineryJobForm({
  terminals,
  methods,
  ores,
}: {
  terminals: TerminalOption[];
  methods: MethodOption[];
  ores: OreOption[];
}) {
  const t = useTranslations("refineryJobs.form");
  const router = useRouter();
  const formId = useId();

  const [terminalId, setTerminalId] = useState(
    terminals[0] ? String(terminals[0].terminalId) : "",
  );
  const [methodCode, setMethodCode] = useState(methods[0]?.code ?? "");
  const [items, setItems] = useState<ItemRow[]>([
    { oreCode: ores[0]?.code ?? "", quantity: "1" },
  ]);
  const [hours, setHours] = useState("0");
  const [minutes, setMinutes] = useState("0");
  const [startedAt, setStartedAt] = useState("");
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  const method = methods.find((m) => m.code === methodCode);

  function setItem(index: number, patch: Partial<ItemRow>) {
    setItems((current) =>
      current.map((item, i) => (i === index ? { ...item, ...patch } : item)),
    );
  }

  const durationMinutes = Number(hours) * 60 + Number(minutes);
  const itemsValid = items.every((item) => {
    const quantity = Number(item.quantity);
    return item.oreCode !== "" && Number.isFinite(quantity) && quantity > 0;
  });
  const canSubmit =
    !busy &&
    terminalId !== "" &&
    methodCode !== "" &&
    items.length > 0 &&
    itemsValid &&
    Number.isInteger(durationMinutes) &&
    durationMinutes >= 1;

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!canSubmit) return;
    setBusy(true);
    setFailed(false);
    try {
      const response = await fetch("/api/refinery-jobs", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          terminalId: Number(terminalId),
          methodCode,
          items: items.map((item) => ({
            oreCode: item.oreCode,
            quantityScu: Number(item.quantity),
          })),
          durationMinutes,
          ...(startedAt !== ""
            ? { startedAt: new Date(startedAt).toISOString() }
            : {}),
        }),
      });
      if (!response.ok) {
        setFailed(true);
        return;
      }
      router.push("/refinery-jobs");
      router.refresh();
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Panel className="p-4">
      <form onSubmit={submit} className="flex flex-col gap-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="flex flex-col gap-1">
            <label
              htmlFor={`${formId}-terminal`}
              className="text-xs text-text-muted"
            >
              {t("terminalLabel")}
            </label>
            <select
              id={`${formId}-terminal`}
              value={terminalId}
              onChange={(event) => setTerminalId(event.target.value)}
              className={selectClass}
            >
              {terminals.map((terminal) => (
                <option key={terminal.terminalId} value={terminal.terminalId}>
                  {terminal.terminalName}
                  {terminal.starSystemName
                    ? ` — ${terminal.starSystemName}`
                    : ""}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label
              htmlFor={`${formId}-method`}
              className="text-xs text-text-muted"
            >
              {t("methodLabel")}
            </label>
            <select
              id={`${formId}-method`}
              value={methodCode}
              onChange={(event) => setMethodCode(event.target.value)}
              className={selectClass}
            >
              {methods.map((option) => (
                <option key={option.code} value={option.code}>
                  {option.name}
                </option>
              ))}
            </select>
            {method && (
              <p className="font-mono text-xs text-text-muted">
                {t("methodRatings", {
                  yield: method.ratingYield,
                  cost: method.ratingCost,
                  speed: method.ratingSpeed,
                })}
              </p>
            )}
          </div>
        </div>

        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1 text-xs text-text-muted">
            {t("itemsLegend")}
          </legend>
          {items.map((item, index) => (
            <div key={index} className="flex flex-wrap items-end gap-2">
              <div className="flex flex-col gap-1">
                <label
                  htmlFor={`${formId}-ore-${index}`}
                  className="text-xs text-text-muted"
                >
                  {t("oreLabel", { index: index + 1 })}
                </label>
                <select
                  id={`${formId}-ore-${index}`}
                  value={item.oreCode}
                  onChange={(event) =>
                    setItem(index, { oreCode: event.target.value })
                  }
                  className={selectClass}
                >
                  {ores.map((ore) => (
                    <option key={ore.code} value={ore.code}>
                      {ore.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label
                  htmlFor={`${formId}-quantity-${index}`}
                  className="text-xs text-text-muted"
                >
                  {t("quantityLabel", { index: index + 1 })}
                </label>
                <input
                  id={`${formId}-quantity-${index}`}
                  type="number"
                  min={0}
                  step="any"
                  value={item.quantity}
                  onChange={(event) =>
                    setItem(index, { quantity: event.target.value })
                  }
                  className={`${inputClass} w-28`}
                />
              </div>
              {items.length > 1 && (
                <Button
                  variant="ghost"
                  type="button"
                  aria-label={t("removeItem", { index: index + 1 })}
                  title={t("removeItem", { index: index + 1 })}
                  onClick={() =>
                    setItems((current) => current.filter((_, i) => i !== index))
                  }
                >
                  <X aria-hidden="true" className="size-4" />
                </Button>
              )}
            </div>
          ))}
          {items.length < JOB_MAX_ITEMS && (
            <div>
              <Button
                variant="ghost"
                type="button"
                onClick={() =>
                  setItems((current) => [
                    ...current,
                    { oreCode: ores[0]?.code ?? "", quantity: "1" },
                  ])
                }
              >
                <Plus aria-hidden="true" className="size-4" />
                {t("addItem")}
              </Button>
            </div>
          )}
        </fieldset>

        <fieldset className="flex flex-col gap-1">
          <legend className="mb-1 text-xs text-text-muted">
            {t("durationLegend")}
          </legend>
          <div className="flex flex-wrap items-end gap-2">
            <div className="flex flex-col gap-1">
              <label
                htmlFor={`${formId}-hours`}
                className="text-xs text-text-muted"
              >
                {t("hoursLabel")}
              </label>
              <input
                id={`${formId}-hours`}
                type="number"
                min={0}
                step={1}
                value={hours}
                onChange={(event) => setHours(event.target.value)}
                className={`${inputClass} w-24`}
              />
            </div>
            <div className="flex flex-col gap-1">
              <label
                htmlFor={`${formId}-minutes`}
                className="text-xs text-text-muted"
              >
                {t("minutesLabel")}
              </label>
              <input
                id={`${formId}-minutes`}
                type="number"
                min={0}
                max={59}
                step={1}
                value={minutes}
                onChange={(event) => setMinutes(event.target.value)}
                className={`${inputClass} w-24`}
              />
            </div>
          </div>
        </fieldset>

        <div className="flex flex-col gap-1">
          <label
            htmlFor={`${formId}-started`}
            className="text-xs text-text-muted"
          >
            {t("startedAtLabel")}
          </label>
          <input
            id={`${formId}-started`}
            type="datetime-local"
            value={startedAt}
            onChange={(event) => setStartedAt(event.target.value)}
            className={`${inputClass} sm:w-64`}
          />
        </div>

        {failed && <p className="text-sm text-warning">{t("error")}</p>}

        <div>
          <Button type="submit" disabled={!canSubmit}>
            {t("submit")}
          </Button>
        </div>
      </form>
    </Panel>
  );
}
