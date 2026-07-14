/**
 * HTTP über das Tauri-http-Plugin: Requests laufen durch Rust (reqwest),
 * damit gilt kein Browser-CORS und der Bearer-Header erreicht das Backend
 * unverändert. Tests mocken dieses Modul.
 */
export { fetch } from "@tauri-apps/plugin-http";
