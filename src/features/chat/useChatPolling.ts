"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ChatDeletion, ChatMessage } from "./chat.schema";

const POLL_INTERVAL_MS = 5000;
// Mehr Nachrichten hält der Client nicht im Speicher — der Server capt
// die Historie ohnehin (CHAT_HISTORY_MAX).
const MAX_CLIENT_MESSAGES = 200;

function merge(
  existing: ChatMessage[],
  incoming: ChatMessage[],
): ChatMessage[] {
  const seen = new Set(existing.map((m) => m.id));
  const fresh = incoming.filter((m) => !seen.has(m.id));
  if (fresh.length === 0) return existing;
  return [...existing, ...fresh].slice(-MAX_CLIENT_MESSAGES);
}

/**
 * Polling-Delivery für den Chat: initialer Fetch beim Öffnen, danach
 * alle 5 s inkrementell über den createdAt-Cursor. Ticks in verborgenen
 * Tabs werden übersprungen; beim Zurückkehren wird sofort nachgeladen.
 */
export function useChatPolling(enabled: boolean): {
  messages: ChatMessage[];
  appendMessage: (message: ChatMessage) => void;
  removeMessage: (id: string) => void;
} {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const cursorRef = useRef<string | null>(null);
  // Löschungen laufen auf einer eigenen Zeitachse (deletedAt) und
  // brauchen deshalb einen eigenen Cursor — der after-Cursor sieht
  // bereits ausgelieferte Nachrichten nie wieder.
  const deletedCursorRef = useRef<string | null>(null);

  const fetchMessages = useCallback(async () => {
    try {
      const after = cursorRef.current;
      const params = new URLSearchParams();
      if (after) params.set("after", after);
      if (deletedCursorRef.current) {
        params.set("deletedAfter", deletedCursorRef.current);
      }
      const query = params.toString();
      const url = query ? `/api/chat/messages?${query}` : "/api/chat/messages";
      const response = await fetch(url);
      if (!response.ok) return;
      const data = (await response.json()) as {
        messages: ChatMessage[];
        deletions?: ChatDeletion[];
      };
      const deletions = data.deletions ?? [];
      setMessages((prev) => {
        const merged = merge(prev, data.messages);
        if (deletions.length === 0) return merged;
        const deletedIds = new Set(deletions.map((d) => d.id));
        return merged.filter((m) => !deletedIds.has(m.id));
      });
      const newest = data.messages[data.messages.length - 1];
      if (newest && (!after || newest.createdAt > after)) {
        cursorRef.current = newest.createdAt;
      }
      const lastDeletion = deletions[deletions.length - 1];
      if (lastDeletion) deletedCursorRef.current = lastDeletion.deletedAt;
    } catch {
      // Fehlgeschlagene Polls still überspringen — der nächste Tick kommt
    }
  }, []);

  /** Optimistisches Entfernen nach eigenem Moderations-Delete (204). */
  const removeMessage = useCallback((id: string) => {
    setMessages((prev) => prev.filter((m) => m.id !== id));
  }, []);

  // Der Cursor bleibt bei optimistischen Appends bewusst unangetastet:
  // der nächste Poll holt so auch Nachrichten nach, die zwischen letztem
  // Tick und dem eigenen Senden eingegangen sind (Dedupe per id).
  const appendMessage = useCallback((message: ChatMessage) => {
    setMessages((prev) => merge(prev, [message]));
  }, []);

  useEffect(() => {
    if (!enabled) return;
    // Initial-Fetch als Timeout(0) statt direkt im Effect-Body —
    // setState gehört in Callbacks (react-hooks/set-state-in-effect)
    const initial = setTimeout(() => void fetchMessages(), 0);

    const interval = setInterval(() => {
      if (document.hidden) return;
      void fetchMessages();
    }, POLL_INTERVAL_MS);

    const onVisibilityChange = () => {
      if (!document.hidden) void fetchMessages();
    };
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      clearTimeout(initial);
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [enabled, fetchMessages]);

  return { messages, appendMessage, removeMessage };
}
