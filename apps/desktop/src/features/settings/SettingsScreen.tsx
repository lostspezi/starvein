import { useEffect, useState } from "react";
import { getVersion } from "@tauri-apps/api/app";
import { invoke } from "@tauri-apps/api/core";
import {
  disable as disableAutostart,
  enable as enableAutostart,
} from "@tauri-apps/plugin-autostart";
import { open as openFileDialog } from "@tauri-apps/plugin-dialog";
import { useTranslations } from "use-intl";
import { getServerUrl, isServerUrlLocked } from "../../lib/config";
import { useSettings } from "../../SettingsContext";
import { checkForUpdate, type AvailableUpdate } from "../../lib/updater";
import { HotkeyRecorder } from "./HotkeyRecorder";
import { DEFAULT_HOTKEY, formatCombo } from "./hotkey";

/** Spiegelt CaptureShortcutStatus in src-tauri/src/shortcuts.rs. */
type CaptureShortcutStatus = {
  shortcut: string;
  registered: boolean;
};

/** Spiegelt GameElevationStatus in src-tauri/src/elevation.rs. */
type GameElevationStatus = {
  gameRunning: boolean;
  hotkeyBlocked: boolean;
};

type HotkeyFeedback = "applied" | "taken" | "invalid" | "failed";

type UpdateState =
  | { kind: "idle" }
  | { kind: "checking" }
  | { kind: "latest" }
  | { kind: "failed" }
  | { kind: "available"; update: AvailableUpdate; installing: boolean };

/** Einstellungen (Slice D6): Hotkey, Sprache, Server, Game.log, Autostart. */
export function SettingsScreen({ onClose }: { onClose: () => void }) {
  const t = useTranslations("settings");
  const { settings, update } = useSettings();
  const [hotkeyFeedback, setHotkeyFeedback] = useState<HotkeyFeedback | null>(
    null,
  );
  const [hotkeyRegistered, setHotkeyRegistered] = useState(true);
  const [hotkeyBlockedByGame, setHotkeyBlockedByGame] = useState(false);
  const [serverDraft, setServerDraft] = useState(settings.serverUrl ?? "");
  const [appVersion, setAppVersion] = useState("");
  const [updateState, setUpdateState] = useState<UpdateState>({ kind: "idle" });
  const activeHotkey = settings.hotkey ?? DEFAULT_HOTKEY;

  useEffect(() => {
    let cancelled = false;
    getVersion()
      .then((version) => {
        if (!cancelled) {
          setAppVersion(version);
        }
      })
      .catch(() => {
        // Version nicht abfragbar — Feld bleibt leer.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Status aus Rust: schlägt die Hotkey-Registrierung fehl (z. B. weil
  // eine andere Anwendung die Kombination hält) oder läuft Star Citizen
  // mit Adminrechten (UIPI blockiert den Hotkey im Spiel), passiert das
  // sonst unsichtbar im Hintergrund.
  useEffect(() => {
    let cancelled = false;
    invoke<CaptureShortcutStatus>("get_capture_shortcut")
      .then((status) => {
        if (!cancelled) {
          setHotkeyRegistered(status.registered);
        }
      })
      .catch(() => {
        // Status nicht abfragbar — keine falsche Warnung anzeigen.
      });
    invoke<GameElevationStatus>("get_game_elevation_status")
      .then((status) => {
        if (!cancelled) {
          setHotkeyBlockedByGame(status.hotkeyBlocked);
        }
      })
      .catch(() => {
        // Status nicht abfragbar — keine falsche Warnung anzeigen.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function applyHotkey(combo: string) {
    setHotkeyFeedback(null);
    try {
      await invoke("set_capture_shortcut", { shortcut: combo });
      await update("hotkey", combo);
      setHotkeyRegistered(true);
      setHotkeyFeedback("applied");
    } catch (error) {
      setHotkeyFeedback(
        error === "unavailable"
          ? "taken"
          : error === "invalid"
            ? "invalid"
            : "failed",
      );
    }
  }

  async function runUpdateCheck() {
    setUpdateState({ kind: "checking" });
    try {
      const update = await checkForUpdate();
      setUpdateState(
        update === null
          ? { kind: "latest" }
          : { kind: "available", update, installing: false },
      );
    } catch {
      setUpdateState({ kind: "failed" });
    }
  }

  async function installUpdate() {
    if (updateState.kind !== "available") {
      return;
    }
    setUpdateState({ ...updateState, installing: true });
    try {
      // Erfolgreiche Installation startet die App neu (relaunch).
      await updateState.update.install();
    } catch {
      setUpdateState({ kind: "failed" });
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
        <div className="flex flex-col gap-1">
          <span className="text-text-muted text-xs">{t("hotkeyLabel")}</span>
          <HotkeyRecorder
            value={activeHotkey}
            label={t("hotkeyLabel")}
            onRecord={(combo) => void applyHotkey(combo)}
          />
          {!hotkeyRegistered && (
            <p className="text-warning text-xs" role="alert">
              {t("hotkeyInactive", { hotkey: formatCombo(activeHotkey) })}
            </p>
          )}
          {hotkeyBlockedByGame && (
            <p className="text-warning text-xs" role="alert">
              {t("gameElevated")}
            </p>
          )}
          {hotkeyFeedback === "applied" && (
            <p className="text-success text-xs" role="status">
              {t("hotkeyApplied", { hotkey: formatCombo(activeHotkey) })}
            </p>
          )}
          {hotkeyFeedback === "taken" && (
            <p className="text-warning text-xs" role="alert">
              {t("hotkeyTaken")}
            </p>
          )}
          {hotkeyFeedback === "invalid" && (
            <p className="text-warning text-xs" role="alert">
              {t("hotkeyInvalid")}
            </p>
          )}
          {hotkeyFeedback === "failed" && (
            <p className="text-warning text-xs" role="alert">
              {t("hotkeyError")}
            </p>
          )}
        </div>

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

        <div className="flex flex-col gap-1">
          <span className="text-text-muted text-xs">{t("versionLabel")}</span>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-text-primary font-mono text-xs">
              {appVersion}
            </span>
            <button
              type="button"
              onClick={() => void runUpdateCheck()}
              disabled={updateState.kind === "checking"}
              className="bg-bg-nebula-2 text-text-primary hover:shadow-glow-sm rounded px-3 py-1.5 text-xs transition-all duration-200 disabled:opacity-50"
            >
              {t("checkUpdates")}
            </button>
            {updateState.kind === "available" && (
              <button
                type="button"
                onClick={() => void installUpdate()}
                disabled={updateState.installing}
                className="bg-accent-primary text-bg-void hover:shadow-glow-primary rounded px-3 py-1.5 text-xs font-medium transition-all duration-200 disabled:opacity-50"
              >
                {updateState.installing
                  ? t("updateInstalling")
                  : t("installUpdate", { version: updateState.update.version })}
              </button>
            )}
          </div>
          {updateState.kind === "latest" && (
            <p className="text-success text-xs" role="status">
              {t("upToDate")}
            </p>
          )}
          {updateState.kind === "failed" && (
            <p className="text-warning text-xs" role="alert">
              {t("updateFailed")}
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
