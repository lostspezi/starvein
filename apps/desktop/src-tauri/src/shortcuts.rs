use serde::Serialize;
use tauri::AppHandle;
use tauri_plugin_store::StoreExt;

use crate::keyboard_hook;

pub const DEFAULT_CAPTURE_SHORTCUT: &str = "ctrl+alt+r";
const SETTINGS_FILE: &str = "settings.json";
const HOTKEY_KEY: &str = "hotkey";

/// Fehlerarten beim Rebind — der Renderer unterscheidet danach die Meldung
/// ("nicht unterstützt" vs. "nicht aktivierbar").
#[derive(Serialize)]
#[serde(rename_all = "lowercase")]
pub enum HotkeyError {
    Invalid,
    Unavailable,
}

/// Status des konfigurierten Hotkeys für die Settings-UI: `registered`
/// ist false, wenn der Keyboard-Hook nicht installiert werden konnte
/// oder der gespeicherte Wert nicht parsebar ist.
#[derive(Serialize)]
pub struct CaptureShortcutStatus {
    pub shortcut: String,
    pub registered: bool,
}

fn stored_shortcut(app: &AppHandle) -> String {
    app.store(SETTINGS_FILE)
        .ok()
        .and_then(|store| store.get(HOTKEY_KEY))
        .and_then(|value| value.as_str().map(str::to_string))
        .unwrap_or_else(|| DEFAULT_CAPTURE_SHORTCUT.to_string())
}

/// Startet den Low-Level-Keyboard-Hook (siehe keyboard_hook.rs — der
/// frühere RegisterHotKey-Weg feuert nicht, solange Star Citizen den
/// Fokus hat) und aktiviert den Hotkey aus den Settings (Fallback:
/// Default). Fehler brechen den App-Start nicht ab, werden aber geloggt
/// und sind über `get_capture_shortcut` für die UI sichtbar.
pub fn register_from_settings(app: &AppHandle) {
    keyboard_hook::start(app.clone());
    let stored = stored_shortcut(app);
    match keyboard_hook::parse_hotkey(&stored) {
        Ok(hotkey) => keyboard_hook::set_hotkey(hotkey),
        Err(error) => {
            eprintln!("stored capture hotkey '{stored}' is invalid: {error}");
            match keyboard_hook::parse_hotkey(DEFAULT_CAPTURE_SHORTCUT) {
                Ok(hotkey) => keyboard_hook::set_hotkey(hotkey),
                Err(error) => eprintln!("default capture hotkey is invalid: {error}"),
            }
        }
    }
}

/// Aktueller Hotkey + ob er wirklich aktiv ist (Hook installiert und
/// gespeicherter Wert entspricht dem aktiven Hotkey).
#[tauri::command]
pub fn get_capture_shortcut(app: AppHandle) -> CaptureShortcutStatus {
    let shortcut = stored_shortcut(&app);
    let registered = keyboard_hook::hook_installed()
        && keyboard_hook::parse_hotkey(&shortcut)
            .map(|hotkey| keyboard_hook::active_hotkey() == Some(hotkey))
            .unwrap_or(false);
    CaptureShortcutStatus {
        shortcut,
        registered,
    }
}

/// Rebind aus den Settings: erst parsen, dann den aktiven Hotkey im Hook
/// tauschen. Ein fehlgeschlagener Versuch lässt den alten Hotkey
/// unangetastet. Der Renderer persistiert den Wert im Settings-Store.
#[tauri::command]
pub fn set_capture_shortcut(shortcut: String) -> Result<(), HotkeyError> {
    let hotkey = keyboard_hook::parse_hotkey(&shortcut).map_err(|_| HotkeyError::Invalid)?;
    if !keyboard_hook::hook_installed() {
        return Err(HotkeyError::Unavailable);
    }
    keyboard_hook::set_hotkey(hotkey);
    Ok(())
}

#[cfg(test)]
mod tests {
    use crate::keyboard_hook::parse_hotkey;

    #[test]
    fn default_shortcut_parses() {
        assert!(parse_hotkey(super::DEFAULT_CAPTURE_SHORTCUT).is_ok());
    }

    #[test]
    fn hotkey_error_serializes_to_stable_strings() {
        assert_eq!(
            serde_json::to_string(&super::HotkeyError::Invalid).unwrap(),
            "\"invalid\""
        );
        assert_eq!(
            serde_json::to_string(&super::HotkeyError::Unavailable).unwrap(),
            "\"unavailable\""
        );
    }
}
