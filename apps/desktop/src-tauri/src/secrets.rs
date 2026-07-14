use keyring::Entry;

/// Ablage im Windows Credential Manager; ein Eintrag pro Key unter dem
/// Service-Namen der App. Fehler werden als String an die Webview gereicht.
const SERVICE: &str = "starvein-companion";

fn entry(key: &str) -> Result<Entry, String> {
    Entry::new(SERVICE, key).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn secret_get(key: String) -> Result<Option<String>, String> {
    match entry(&key)?.get_password() {
        Ok(value) => Ok(Some(value)),
        Err(keyring::Error::NoEntry) => Ok(None),
        Err(e) => Err(e.to_string()),
    }
}

#[tauri::command]
pub fn secret_set(key: String, value: String) -> Result<(), String> {
    entry(&key)?.set_password(&value).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn secret_delete(key: String) -> Result<(), String> {
    match entry(&key)?.delete_credential() {
        Ok(()) | Err(keyring::Error::NoEntry) => Ok(()),
        Err(e) => Err(e.to_string()),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn missing_secret_reads_as_none() {
        let key = "starvein-test-does-not-exist";
        let _ = secret_delete(key.to_string());
        assert_eq!(secret_get(key.to_string()), Ok(None));
    }

    #[test]
    fn set_get_delete_roundtrip() {
        let key = "starvein-test-roundtrip";
        secret_set(key.to_string(), "value-1".to_string()).unwrap();
        assert_eq!(secret_get(key.to_string()), Ok(Some("value-1".to_string())));
        secret_delete(key.to_string()).unwrap();
        assert_eq!(secret_get(key.to_string()), Ok(None));
    }
}
