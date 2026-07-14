import { invoke } from "@tauri-apps/api/core";

/**
 * Session-Token-Ablage im Windows Credential Manager (Rust-Seite:
 * src-tauri/src/secrets.rs, keyring-Crate). Bewusst nicht im plugin-store —
 * der schreibt Klartext-JSON und ist nur für unkritische Settings gedacht.
 */
const TOKEN_KEY = "session-token";

export async function getSessionToken(): Promise<string | null> {
  return await invoke<string | null>("secret_get", { key: TOKEN_KEY });
}

export async function setSessionToken(value: string): Promise<void> {
  await invoke("secret_set", { key: TOKEN_KEY, value });
}

export async function clearSessionToken(): Promise<void> {
  await invoke("secret_delete", { key: TOKEN_KEY });
}
