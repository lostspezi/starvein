"use client";

import { MessagesSquare, X } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useSyncExternalStore } from "react";
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

function MessageRow({ message }: { message: ChatMessage }) {
  const locale = useLocale();
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
      </div>
      <p className="text-sm break-words text-text-primary">{message.body}</p>
    </div>
  );
}

/**
 * Einklappbarer Community-Chat, rechts über allen Seiten (fixed Overlay —
 * verändert nie die Content-Breite). Lesen ist öffentlich, Senden nur mit
 * Session. Der Auf-/Zu-Zustand lebt in localStorage (siehe Store oben);
 * SSR rendert immer den zugeklappten Zustand.
 */
export function ChatAside() {
  const t = useTranslations("chat");
  const open = useSyncExternalStore(subscribeOpen, readStoredOpen, () => false);
  const { data: session } = useSession();
  const { messages, appendMessage } = useChatPolling(open);
  const listRef = useRef<HTMLDivElement>(null);

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
            <MessageRow key={message.id} message={message} />
          ))
        )}
      </div>

      <footer className="border-t border-glass-border px-4 py-3">
        {session?.user ? (
          <ChatComposer onSent={appendMessage} />
        ) : (
          <p className="text-sm text-text-muted">{t("loginToSend")}</p>
        )}
      </footer>
    </aside>
  );
}
