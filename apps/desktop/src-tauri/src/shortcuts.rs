use serde::Serialize;
use tauri::AppHandle;
use tauri_plugin_global_shortcut::{GlobalShortcutExt, Shortcut, ShortcutState};
use tauri_plugin_store::StoreExt;

pub const DEFAULT_CAPTURE_SHORTCUT: &str = "ctrl+alt+r";
const SETTINGS_FILE: &str = "settings.json";
const HOTKEY_KEY: &str = "hotkey";

/// Fehlerarten beim Rebind — der Renderer unterscheidet danach die Meldung
/// ("nicht unterstützt" vs. "von anderer Anwendung belegt").
#[derive(Serialize)]
#[serde(rename_all = "lowercase")]
pub enum HotkeyError {
    Invalid,
    Unavailable,
}

/// Status des konfigurierten Hotkeys für die Settings-UI: `registered` ist
/// false, wenn die OS-Registrierung fehlschlug (typisch: eine andere
/// Anwendung hält dieselbe Kombination).
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

/// Registriert den Capture-Hotkey aus den Settings (Fallback: Default).
/// Fehler brechen den App-Start nicht ab, werden aber geloggt und sind
/// über `get_capture_shortcut` für die UI sichtbar.
pub fn register_from_settings(app: &AppHandle) {
    let stored = stored_shortcut(app);
    if let Err(error) = register(app, &stored) {
        eprintln!("capture hotkey '{stored}' not registered: {error}");
        if stored != DEFAULT_CAPTURE_SHORTCUT {
            if let Err(error) = register(app, DEFAULT_CAPTURE_SHORTCUT) {
                eprintln!(
                    "default capture hotkey '{DEFAULT_CAPTURE_SHORTCUT}' not registered: {error}"
                );
            }
        }
    }
}

fn register(app: &AppHandle, shortcut: &str) -> Result<(), String> {
    let parsed: Shortcut = shortcut
        .parse()
        .map_err(|e| format!("invalid shortcut '{shortcut}': {e}"))?;
    register_parsed(app, parsed)
}

fn register_parsed(app: &AppHandle, shortcut: Shortcut) -> Result<(), String> {
    app.global_shortcut()
        .on_shortcut(shortcut, |app, _shortcut, event| {
            if event.state() == ShortcutState::Pressed {
                crate::on_capture_hotkey(app);
            }
        })
        .map_err(|e| e.to_string())
}

/// Aktueller Hotkey + ob er wirklich im System registriert ist.
#[tauri::command]
pub fn get_capture_shortcut(app: AppHandle) -> CaptureShortcutStatus {
    let shortcut = stored_shortcut(&app);
    let registered = shortcut
        .parse::<Shortcut>()
        .map(|parsed| app.global_shortcut().is_registered(parsed))
        .unwrap_or(false);
    CaptureShortcutStatus {
        shortcut,
        registered,
    }
}

/// Rebind aus den Settings (Slice D6): erst parsen, dann alten Hotkey
/// lösen und den neuen registrieren. Schlägt die Registrierung fehl
/// (Kombination anderweitig belegt), wird der alte wiederhergestellt,
/// damit ein fehlgeschlagener Versuch keinen funktionierenden Hotkey
/// zerstört. Der Renderer persistiert den Wert im Settings-Store.
#[tauri::command]
pub fn set_capture_shortcut(app: AppHandle, shortcut: String) -> Result<(), HotkeyError> {
    let parsed: Shortcut = shortcut.trim().parse().map_err(|_| HotkeyError::Invalid)?;
    let previous = stored_shortcut(&app);
    let _ = app.global_shortcut().unregister_all();
    if register_parsed(&app, parsed).is_err() {
        let _ = register(&app, &previous);
        return Err(HotkeyError::Unavailable);
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use tauri_plugin_global_shortcut::Shortcut;

    #[test]
    fn default_shortcut_parses() {
        assert!(super::DEFAULT_CAPTURE_SHORTCUT.parse::<Shortcut>().is_ok());
    }

    /// Der HotkeyRecorder im Frontend erzeugt Kombinationen aus
    /// ctrl/alt/shift/super + Buchstabe/Ziffer/F-Taste — dieser Ausschnitt
    /// des Wertebereichs muss vom Rust-Parser akzeptiert werden.
    #[test]
    fn recorder_output_space_parses() {
        for combo in [
            "ctrl+alt+m",
            "ctrl+shift+3",
            "super+k",
            "f5",
            "ctrl+alt+shift+f13",
        ] {
            assert!(combo.parse::<Shortcut>().is_ok(), "combo: {combo}");
        }
    }

    #[test]
    fn garbage_shortcut_fails_to_parse() {
        assert!("strg+ö".parse::<Shortcut>().is_err());
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
