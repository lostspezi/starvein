"use client";

import { MessagesSquare, Timer, Trash2, X } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import {
  canModerateChat,
  TIMEOUT_DURATIONS_MINUTES,
  toRole,
  type TimeoutDurationMinutes,
} from "@/features/moderation/roles";
import { useSession } from "@/lib/auth-client";
import { Button } from "@/lib/components/ui/Button";
import type { ChatMessage } from "./chat.schema";
import { ChatComposer } from "./ChatComposer";
import { useChatPolling } from "./useChatPolling";

const STORAGE_KEY = "starvein.chat.open";

// localStorage als Source of Truth für den Auf-/Zu-Zustand: der Server-
// Snapshot ist immer "zu", nach der Hydration übernimmt der Client-Wert —
// hydration-sicher ohne setState im Effect.
const openListeners = new Set<() => void>();

function subscribeOpen(listener: () => void): () => void {
  openListeners.add(listener);
  return () => openListeners.delete(listener);
}

function readStoredOpen(): boolean {
  return window.localStorage.getItem(STORAGE_KEY) === "1";
}

function writeStoredOpen(next: boolean): void {
  window.localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
  openListeners.forEach((listener) => listener());
}

const DURATION_LABEL_KEYS: Record<TimeoutDurationMinutes, string> = {
  5: "m5",
  60: "h1",
  1440: "h24",
};

function MessageRow({
  message,
  canModerate,
  isOwn,
  onDelete,
  onTimeout,
}: {
  message: ChatMessage;
  canModerate: boolean;
  isOwn: boolean;
  onDelete: (id: string) => void;
  onTimeout: (message: ChatMessage, minutes: TimeoutDurationMinutes) => void;
}) {
  const t = useTranslations("chat");
  const locale = useLocale();
  const [pickerOpen, setPickerOpen] = useState(false);
  // Nachrichten werden ausschließlich clientseitig gerendert (fetch im
  // Effect), daher ist die lokale Zeitzone hier hydration-sicher.
  const time = new Date(message.createdAt).toLocaleTimeString(locale, {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div>
      <div className="flex items-baseline gap-2">
        <span className="text-xs font-medium text-accent-cyan">
          {message.userName}
        </span>
        <span className="font-mono text-[10px] text-text-muted">{time}</span>
        {canModerate && (
          <span className="ml-auto flex items-center gap-0.5">
            <Button
              variant="ghost"
              onClick={() => onDelete(message.id)}
              aria-label={t("moderation.delete")}
              title={t("moderation.delete")}
              className="px-1 py-1"
            >
              <Trash2 aria-hidden="true" className="size-4" />
            </Button>
            {!isOwn && (
              <Button
                variant="ghost"
                onClick={() => setPickerOpen((open) => !open)}
                aria-label={t("moderation.timeout")}
                title={t("moderation.timeout")}
                aria-expanded={pickerOpen}
                className="px-1 py-1"
              >
                <Timer aria-hidden="true" className="size-4" />
              </Button>
            )}
          </span>
        )}
      </div>
      <p className="text-sm break-words text-text-primary">{message.body}</p>
      {pickerOpen && (
        <div className="mt-1 flex gap-1.5">
          {TIMEOUT_DURATIONS_MINUTES.map((minutes) => (
            <Button
              key={minutes}
              variant="ghost"
              onClick={() => {
                setPickerOpen(false);
                onTimeout(message, minutes);
              }}
              className="border border-glass-border px-2 py-0.5 text-xs"
            >
              {t(`moderation.durations.${DURATION_LABEL_KEYS[minutes]}`)}
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Einklappbarer Community-Chat, rechts über allen Seiten (fixed Overlay —
 * verändert nie die Content-Breite). Lesen ist öffentlich, Senden nur mit
 * Session; Moderatoren/Admins bekommen Lösch- und Timeout-Aktionen.
 * Der Auf-/Zu-Zustand lebt in localStorage (siehe Store oben);
 * SSR rendert immer den zugeklappten Zustand.
 */
export function ChatAside() {
  const t = useTranslations("chat");
  const open = useSyncExternalStore(subscribeOpen, readStoredOpen, () => false);
  const { data: session } = useSession();
  const { messages, appendMessage, removeMessage } = useChatPolling(open);
  const listRef = useRef<HTMLDivElement>(null);
  const [moderationNote, setModerationNote] = useState<string | null>(null);

  const sessionUser = session?.user as
    { id: string; role?: unknown } | undefined;
  const canModerate = canModerateChat(toRole(sessionUser?.role));

  const toggle = useCallback((next: boolean) => {
    writeStoredOpen(next);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") toggle(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, toggle]);

  // Ans Ende scrollen, solange der Nutzer nicht in der Historie liest
  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const nearBottom =
      list.scrollHeight - list.scrollTop - list.clientHeight < 80;
    if (nearBottom) list.scrollTop = list.scrollHeight;
  }, [messages]);

  const handleDelete = useCallback(
    async (id: string) => {
      setModerationNote(null);
      try {
        const response = await fetch(`/api/chat/messages/${id}`, {
          method: "DELETE",
        });
        if (response.ok) {
          removeMessage(id);
        } else {
          setModerationNote("failed");
        }
      } catch {
        setModerationNote("failed");
      }
    },
    [removeMessage],
  );

  const handleTimeout = useCallback(
    async (message: ChatMessage, minutes: TimeoutDurationMinutes) => {
      setModerationNote(null);
      try {
        const response = await fetch("/api/chat/timeouts", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            userId: message.userId,
            durationMinutes: minutes,
          }),
        });
        if (response.ok) {
          setModerationNote("applied");
        } else {
          const data = (await response.json()) as { error?: string };
          setModerationNote(
            data.error === "cannotModerate" ? "cannotModerate" : "failed",
          );
        }
      } catch {
        setModerationNote("failed");
      }
    },
    [],
  );

  if (!open) {
    return (
      <Button
        onClick={() => toggle(true)}
        aria-label={t("open")}
        aria-expanded={false}
        title={t("open")}
        className="fixed right-4 bottom-4 z-40 px-2.5 py-2.5 shadow-glow-primary"
      >
        <MessagesSquare aria-hidden="true" className="size-5" />
      </Button>
    );
  }

  return (
    <aside
      aria-label={t("title")}
      className="fixed inset-y-0 right-0 z-50 flex w-full flex-col border-l border-glass-border bg-glass backdrop-blur-md sm:w-96"
    >
      <header className="flex items-center justify-between border-b border-glass-border px-4 py-3">
        <h2 className="text-sm font-medium text-text-primary">{t("title")}</h2>
        <Button
          variant="ghost"
          onClick={() => toggle(false)}
          aria-label={t("close")}
          title={t("close")}
          className="px-1.5 py-1.5"
        >
          <X aria-hidden="true" className="size-4" />
        </Button>
      </header>

      <div ref={listRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-3">
        {messages.length === 0 ? (
          <p className="text-sm text-text-muted">{t("empty")}</p>
        ) : (
          messages.map((message) => (
            <MessageRow
              key={message.id}
              message={message}
              canModerate={canModerate}
              isOwn={message.userId === sessionUser?.id}
              onDelete={handleDelete}
              onTimeout={handleTimeout}
            />
          ))
        )}
      </div>

      <footer className="space-y-1.5 border-t border-glass-border px-4 py-3">
        {moderationNote && (
          <p role="status" className="text-xs text-text-muted">
            {t(`moderation.${moderationNote}`)}
          </p>
        )}
        {session?.user ? (
          <ChatComposer onSent={appendMessage} />
        ) : (
          <p className="text-sm text-text-muted">{t("loginToSend")}</p>
        )}
      </footer>
    </aside>
  );
}
