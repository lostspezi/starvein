use serde::Serialize;
use windows::Win32::Foundation::{CloseHandle, E_ACCESSDENIED, HANDLE};
use windows::Win32::Security::{GetTokenInformation, TokenElevation, TOKEN_ELEVATION, TOKEN_QUERY};
use windows::Win32::System::Threading::{
    GetCurrentProcess, OpenProcess, OpenProcessToken, PROCESS_QUERY_LIMITED_INFORMATION,
};

/// Läuft Star Citizen mit höherer Integrität als der Companion, blockiert
/// Windows (UIPI) den globalen Capture-Hotkey, solange das Spiel den Fokus
/// hat — für die Nutzerin sieht das wie ein toter Hotkey aus. Die
/// Settings-UI zeigt dafür eine Warnung an.
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct GameElevationStatus {
    pub game_running: bool,
    pub hotkey_blocked: bool,
}

/// Blockiert ist der Hotkey nur, wenn das Spiel erhöht läuft und der
/// Companion nicht. Läuft der Companion selbst erhöht, greift UIPI nicht;
/// ist die Elevation des Spiels nicht feststellbar, keine Warnung.
fn hotkey_blocked(own_elevated: bool, game_elevated: Option<bool>) -> bool {
    !own_elevated && game_elevated.unwrap_or(false)
}

fn token_elevated(process: HANDLE) -> Option<bool> {
    unsafe {
        let mut token = HANDLE::default();
        OpenProcessToken(process, TOKEN_QUERY, &mut token).ok()?;
        let mut elevation = TOKEN_ELEVATION::default();
        let mut returned = 0u32;
        let result = GetTokenInformation(
            token,
            TokenElevation,
            Some(std::ptr::from_mut(&mut elevation).cast()),
            std::mem::size_of::<TOKEN_ELEVATION>() as u32,
            &mut returned,
        );
        let _ = CloseHandle(token);
        result.ok()?;
        Some(elevation.TokenIsElevated != 0)
    }
}

fn game_process_elevated(pid: u32) -> Option<bool> {
    unsafe {
        match OpenProcess(PROCESS_QUERY_LIMITED_INFORMATION, false, pid) {
            Ok(process) => {
                let elevated = token_elevated(process);
                let _ = CloseHandle(process);
                elevated
            }
            // Selbst der limitierte Zugriff wurde verweigert: der Prozess
            // ist höher privilegiert oder geschützt — genau die Fälle, in
            // denen UIPI den Hotkey blockiert.
            Err(error) if error.code() == E_ACCESSDENIED => Some(true),
            Err(_) => None,
        }
    }
}

#[tauri::command]
pub fn get_game_elevation_status() -> GameElevationStatus {
    let Some(pid) = crate::capture::star_citizen_pid() else {
        return GameElevationStatus {
            game_running: false,
            hotkey_blocked: false,
        };
    };
    let own_elevated = token_elevated(unsafe { GetCurrentProcess() }).unwrap_or(false);
    GameElevationStatus {
        game_running: true,
        hotkey_blocked: hotkey_blocked(own_elevated, game_process_elevated(pid)),
    }
}

#[cfg(test)]
mod tests {
    use super::hotkey_blocked;

    #[test]
    fn blocked_only_when_game_is_higher_privileged() {
        assert!(hotkey_blocked(false, Some(true)));
    }

    #[test]
    fn not_blocked_when_companion_is_also_elevated() {
        assert!(!hotkey_blocked(true, Some(true)));
    }

    #[test]
    fn not_blocked_when_game_is_not_elevated() {
        assert!(!hotkey_blocked(false, Some(false)));
    }

    #[test]
    fn unknown_game_elevation_never_warns() {
        assert!(!hotkey_blocked(false, None));
        assert!(!hotkey_blocked(true, None));
    }

    #[test]
    fn own_process_elevation_is_queryable() {
        // GetCurrentProcess liefert ein Pseudo-Handle — die Token-Abfrage
        // muss für den eigenen Prozess immer beantwortbar sein.
        let own = super::token_elevated(unsafe {
            windows::Win32::System::Threading::GetCurrentProcess()
        });
        assert!(own.is_some());
    }
}
