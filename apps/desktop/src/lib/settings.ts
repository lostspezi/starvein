import { load } from "@tauri-apps/plugin-store";

/**
 * Nicht-geheime App-Einstellungen im plugin-store (settings.json im
 * App-Data-Verzeichnis). Der Session-Token liegt bewusst NICHT hier,
 * sondern im Credential Manager (secrets.ts).
 */
export type AppSettings = {
  locale: "de" | "en" | null;
  serverUrl: string | null;
  hotkey: string | null;
  scLogPath: string | null;
  autostart: boolean;
};

export const DEFAULT_SETTINGS: AppSettings = {
  locale: null,
  serverUrl: null,
  hotkey: null,
  scLogPath: null,
  autostart: false,
};

const SETTINGS_FILE = "settings.json";

export async function loadSettings(): Promise<AppSettings> {
  const store = await load(SETTINGS_FILE, { autoSave: true, defaults: {} });
  const settings = { ...DEFAULT_SETTINGS };
  for (const key of Object.keys(DEFAULT_SETTINGS) as (keyof AppSettings)[]) {
    const value = await store.get(key);
    if (value !== undefined && value !== null) {
      Object.assign(settings, { [key]: value });
    }
  }
  return settings;
}

export async function saveSetting<K extends keyof AppSettings>(
  key: K,
  value: AppSettings[K],
): Promise<void> {
  const store = await load(SETTINGS_FILE, { autoSave: true, defaults: {} });
  await store.set(key, value);
}
