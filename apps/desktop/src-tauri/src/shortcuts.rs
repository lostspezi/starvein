use tauri::AppHandle;
use tauri_plugin_global_shortcut::{GlobalShortcutExt, Shortcut, ShortcutState};
use tauri_plugin_store::StoreExt;

pub const DEFAULT_CAPTURE_SHORTCUT: &str = "ctrl+alt+r";
const SETTINGS_FILE: &str = "settings.json";
const HOTKEY_KEY: &str = "hotkey";

fn stored_shortcut(app: &AppHandle) -> String {
    app.store(SETTINGS_FILE)
        .ok()
        .and_then(|store| store.get(HOTKEY_KEY))
        .and_then(|value| value.as_str().map(str::to_string))
        .unwrap_or_else(|| DEFAULT_CAPTURE_SHORTCUT.to_string())
}

/// Registriert den Capture-Hotkey aus den Settings (Fallback: Default).
/// Ein ungültig gespeicherter Wert fällt still auf den Default zurück.
pub fn register_from_settings(app: &AppHandle) -> Result<(), String> {
    let stored = stored_shortcut(app);
    if register(app, &stored).is_err() && stored != DEFAULT_CAPTURE_SHORTCUT {
        return register(app, DEFAULT_CAPTURE_SHORTCUT);
    }
    Ok(())
}

fn register(app: &AppHandle, shortcut: &str) -> Result<(), String> {
    let parsed: Shortcut = shortcut
        .parse()
        .map_err(|e| format!("invalid shortcut '{shortcut}': {e}"))?;
    app.global_shortcut()
        .on_shortcut(parsed, |app, _shortcut, event| {
            if event.state() == ShortcutState::Pressed {
                crate::on_capture_hotkey(app);
            }
        })
        .map_err(|e| e.to_string())
}

/// Rebind aus den Settings (Slice D6): alten Hotkey lösen, neuen
/// registrieren. Der Renderer persistiert den Wert im Settings-Store.
#[tauri::command]
pub fn set_capture_shortcut(app: AppHandle, shortcut: String) -> Result<(), String> {
    let _ = app.global_shortcut().unregister_all();
    register(&app, &shortcut)
}

#[cfg(test)]
mod tests {
    use tauri_plugin_global_shortcut::Shortcut;

    #[test]
    fn default_shortcut_parses() {
        assert!(super::DEFAULT_CAPTURE_SHORTCUT.parse::<Shortcut>().is_ok());
    }

    #[test]
    fn garbage_shortcut_fails_to_parse() {
        assert!("strg+ö".parse::<Shortcut>().is_err());
    }
}
