import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import {
  disable as disableAutostart,
  enable as enableAutostart,
} from "@tauri-apps/plugin-autostart";
import { open as openFileDialog } from "@tauri-apps/plugin-dialog";
import { useTranslations } from "use-intl";
import { getServerUrl, isServerUrlLocked } from "../../lib/config";
import { useSettings } from "../../SettingsContext";

const DEFAULT_HOTKEY = "ctrl+alt+r";

/** Einstellungen (Slice D6): Hotkey, Sprache, Server, Game.log, Autostart. */
export function SettingsScreen({ onClose }: { onClose: () => void }) {
  const t = useTranslations("settings");
  const { settings, update } = useSettings();
  const [hotkeyDraft, setHotkeyDraft] = useState(
    settings.hotkey ?? DEFAULT_HOTKEY,
  );
  const [hotkeyError, setHotkeyError] = useState(false);
  const [serverDraft, setServerDraft] = useState(settings.serverUrl ?? "");

  async function applyHotkey() {
    setHotkeyError(false);
    try {
      await invoke("set_capture_shortcut", { shortcut: hotkeyDraft.trim() });
      await update("hotkey", hotkeyDraft.trim());
    } catch {
      setHotkeyError(true);
    }
  }

  async function toggleAutostart(enabled: boolean) {
    try {
      if (enabled) {
        await enableAutostart();
      } else {
        await disableAutostart();
      }
      await update("autostart", enabled);
    } catch {
      // Registry-Zugriff fehlgeschlagen — Zustand unverändert lassen
    }
  }

  async function pickLogFile() {
    const path = await openFileDialog({
      multiple: false,
      filters: [{ name: "Game.log", extensions: ["log"] }],
    });
    if (typeof path === "string") {
      await update("scLogPath", path);
    }
  }

  const inputClasses =
    "border-glass-border bg-bg-nebula text-text-primary rounded border px-2 py-1.5 text-sm";
  const labelClasses = "text-text-muted flex flex-col gap-1 text-xs";

  return (
    <section className="border-glass-border bg-glass w-full max-w-2xl rounded-lg border p-4 backdrop-blur-md">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-accent-ice text-sm font-medium tracking-wide">
          {t("title")}
        </h2>
        <button
          type="button"
          onClick={onClose}
          className="text-text-muted hover:bg-bg-nebula-2 hover:text-text-primary rounded px-2 py-1 text-xs transition-colors duration-150"
        >
          {t("close")}
        </button>
      </div>

      <div className="flex flex-col gap-4">
        <div className="flex items-end gap-2">
          <label className={labelClasses}>
            {t("hotkeyLabel")}
            <input
              aria-label={t("hotkeyLabel")}
              value={hotkeyDraft}
              onChange={(event) => setHotkeyDraft(event.target.value)}
              spellCheck={false}
              className={`${inputClasses} w-48 font-mono`}
            />
          </label>
          <button
            type="button"
            onClick={() => void applyHotkey()}
            className="bg-bg-nebula-2 text-text-primary hover:shadow-glow-sm rounded px-3 py-1.5 text-xs transition-all duration-200"
          >
            {t("applyHotkey")}
          </button>
        </div>
        {hotkeyError && (
          <p className="text-warning text-xs" role="alert">
            {t("hotkeyError")}
          </p>
        )}

        <label className={labelClasses}>
          {t("localeLabel")}
          <select
            aria-label={t("localeLabel")}
            value={settings.locale ?? ""}
            onChange={(event) =>
              void update(
                "locale",
                event.target.value === ""
                  ? null
                  : (event.target.value as "de" | "en"),
              )
            }
            className={`${inputClasses} w-48`}
          >
            <option value="">{t("localeSystem")}</option>
            <option value="de">Deutsch</option>
            <option value="en">English</option>
          </select>
        </label>

        {isServerUrlLocked() ? (
          // Release-Build: Server fest auf die offizielle Instanz gepinnt.
          <div className="flex flex-col gap-1">
            <span className="text-text-muted text-xs">{t("serverLabel")}</span>
            <span className="text-text-muted font-mono text-xs">
              {getServerUrl()}
            </span>
          </div>
        ) : (
          <div className="flex items-end gap-2">
            <label className={labelClasses}>
              {t("serverLabel")}
              <input
                aria-label={t("serverLabel")}
                value={serverDraft}
                onChange={(event) => setServerDraft(event.target.value)}
                placeholder="https://starvein.app"
                spellCheck={false}
                className={`${inputClasses} w-72`}
              />
            </label>
            <button
              type="button"
              onClick={() =>
                void update(
                  "serverUrl",
                  serverDraft.trim() === "" ? null : serverDraft.trim(),
                )
              }
              className="bg-bg-nebula-2 text-text-primary hover:shadow-glow-sm rounded px-3 py-1.5 text-xs transition-all duration-200"
            >
              {t("applyServer")}
            </button>
          </div>
        )}

        <div className="flex flex-col gap-1">
          <span className="text-text-muted text-xs">{t("logPathLabel")}</span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => void pickLogFile()}
              className="bg-bg-nebula-2 text-text-primary hover:shadow-glow-sm rounded px-3 py-1.5 text-xs transition-all duration-200"
            >
              {t("pickLogFile")}
            </button>
            <span className="text-text-muted truncate font-mono text-xs">
              {settings.scLogPath ?? t("logPathUnset")}
            </span>
          </div>
        </div>

        <label className="text-text-muted flex items-center gap-2 text-xs">
          <input
            type="checkbox"
            aria-label={t("autostartLabel")}
            checked={settings.autostart}
            onChange={(event) => void toggleAutostart(event.target.checked)}
          />
          {t("autostartLabel")}
        </label>
      </div>
    </section>
  );
}
