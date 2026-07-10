"use client";

import { useTranslations } from "next-intl";
import { useEffect, useId, useState } from "react";
import { Button } from "@/lib/components/ui/Button";
import {
  CHAT_MESSAGE_MAX_LENGTH,
  CHAT_REJECTION_CODES,
  type ChatMessage,
} from "./chat.schema";

const SLOW_MODE_SECONDS = 30;

type ErrorKey =
  (typeof CHAT_REJECTION_CODES)[number] | "rateLimited" | "generic";

/** Restzeit eines Timeouts in ganzen Minuten (mindestens 1). */
function minutesUntil(until: string): number {
  return Math.max(1, Math.ceil((Date.parse(until) - Date.now()) / 60_000));
}

function toErrorKey(code: unknown): ErrorKey {
  return CHAT_REJECTION_CODES.includes(code as never)
    ? (code as ErrorKey)
    : "generic";
}

export function ChatComposer({
  onSent,
}: {
  onSent: (message: ChatMessage) => void;
}) {
  const t = useTranslations("chat");
  const inputId = useId();
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<ErrorKey | null>(null);
  const [timedOutMinutes, setTimedOutMinutes] = useState<number | null>(null);
  const [cooldownSeconds, setCooldownSeconds] = useState(0);

  useEffect(() => {
    if (cooldownSeconds <= 0) return;
    const timeout = setTimeout(
      () => setCooldownSeconds((seconds) => seconds - 1),
      1000,
    );
    return () => clearTimeout(timeout);
  }, [cooldownSeconds]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (busy || cooldownSeconds > 0) return;
    const body = value.trim();
    if (!body) return;

    setBusy(true);
    setError(null);
    setTimedOutMinutes(null);
    try {
      const response = await fetch("/api/chat/messages", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ body }),
      });
      if (response.status === 201) {
        const message = (await response.json()) as ChatMessage;
        setValue("");
        onSent(message);
        setCooldownSeconds(SLOW_MODE_SECONDS);
      } else if (response.status === 403) {
        const data = (await response.json()) as { until?: string };
        if (data.until) {
          setTimedOutMinutes(minutesUntil(data.until));
        } else {
          setError("generic");
        }
      } else if (response.status === 429) {
        const data = (await response.json()) as { retryAfterSeconds?: number };
        setError("rateLimited");
        setCooldownSeconds(data.retryAfterSeconds ?? SLOW_MODE_SECONDS);
      } else if (response.status === 422) {
        const data = (await response.json()) as { error?: string };
        setError(toErrorKey(data.error));
      } else {
        setError("generic");
      }
    } catch {
      setError("generic");
    } finally {
      setBusy(false);
    }
  }

  const coolingDown = cooldownSeconds > 0;

  return (
    <form onSubmit={submit} className="space-y-1.5">
      <div className="flex items-center gap-2">
        <label htmlFor={inputId} className="sr-only">
          {t("placeholder")}
        </label>
        <input
          id={inputId}
          type="text"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          maxLength={CHAT_MESSAGE_MAX_LENGTH}
          placeholder={t("placeholder")}
          autoComplete="off"
          className="min-w-0 flex-1 rounded border border-glass-border bg-bg-nebula px-2.5 py-1.5 text-sm text-text-primary placeholder:text-text-muted"
        />
        <Button type="submit" disabled={busy || coolingDown}>
          {coolingDown ? (
            <span className="font-mono">
              {t("cooldown", { seconds: cooldownSeconds })}
            </span>
          ) : (
            t("send")
          )}
        </Button>
      </div>
      {error && (
        <p role="status" className="text-xs text-warning">
          {t(`errors.${error}`)}
        </p>
      )}
      {timedOutMinutes !== null && (
        <p role="status" className="text-xs text-warning">
          {t("errors.timedOut", { minutes: timedOutMinutes })}
        </p>
      )}
    </form>
  );
}
