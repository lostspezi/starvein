"use client";

import { useCallback, useEffect, useState } from "react";
import type { TickerEntry } from "./ticker.service";

// UEX-Sync läuft alle 30 min — 5-Minuten-Polling ist mehr als frisch genug.
const POLL_INTERVAL_MS = 300_000;

/**
 * Liefert die Ticker-Einträge für die Client-Marquee: initialer Fetch beim
 * Mount, danach periodisch. Ticks in verborgenen Tabs werden übersprungen;
 * beim Zurückkehren wird sofort nachgeladen (Muster useChatPolling).
 * `null` = noch am Laden — die Komponente reserviert dann die Leistenhöhe,
 * damit der Seiteninhalt beim Eintreffen der Daten nicht springt.
 */
export function usePriceTicker(): TickerEntry[] | null {
  const [entries, setEntries] = useState<TickerEntry[] | null>(null);

  const fetchEntries = useCallback(async () => {
    try {
      const response = await fetch("/api/price-ticker");
      if (!response.ok) {
        // Bestätigter Fehlschlag: Platzhalter einklappen statt ewig reservieren
        setEntries((prev) => prev ?? []);
        return;
      }
      const data = (await response.json()) as TickerEntry[];
      setEntries(data);
    } catch {
      // Fehlgeschlagene Polls still überspringen — der nächste Tick kommt
      setEntries((prev) => prev ?? []);
    }
  }, []);

  useEffect(() => {
    // Initial-Fetch als Timeout(0) statt direkt im Effect-Body —
    // setState gehört in Callbacks (react-hooks/set-state-in-effect)
    const initial = setTimeout(() => void fetchEntries(), 0);

    const interval = setInterval(() => {
      if (document.hidden) return;
      void fetchEntries();
    }, POLL_INTERVAL_MS);

    const onVisibilityChange = () => {
      if (!document.hidden) void fetchEntries();
    };
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      clearTimeout(initial);
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [fetchEntries]);

  return entries;
}
