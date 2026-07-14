import { createContext, useCallback, useContext, useState } from "react";
import { setServerUrl } from "./lib/config";
import { saveSetting, type AppSettings } from "./lib/settings";

type SettingsContextValue = {
  settings: AppSettings;
  update: <K extends keyof AppSettings>(
    key: K,
    value: AppSettings[K],
  ) => Promise<void>;
};

const SettingsContext = createContext<SettingsContextValue | null>(null);

/**
 * Hält die App-Einstellungen im State und persistiert Änderungen in den
 * plugin-store; Server-URL-Änderungen wirken sofort auf alle API-Calls.
 */
export function SettingsProvider({
  initial,
  children,
}: {
  initial: AppSettings;
  children: React.ReactNode;
}) {
  const [settings, setSettings] = useState<AppSettings>(initial);

  const update = useCallback(
    async <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
      setSettings((current) => ({ ...current, [key]: value }));
      if (key === "serverUrl") {
        setServerUrl(value as string | null);
      }
      await saveSetting(key, value).catch(() => {
        // Persistenz-Fehler ist nicht fatal — Wert gilt für diese Sitzung.
      });
    },
    [],
  );

  return (
    <SettingsContext.Provider value={{ settings, update }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings(): SettingsContextValue {
  const value = useContext(SettingsContext);
  if (!value) {
    throw new Error("useSettings must be used inside SettingsProvider");
  }
  return value;
}
