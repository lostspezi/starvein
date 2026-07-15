mod capture;
mod elevation;
mod keyboard_hook;
mod ocr;
mod secrets;
mod shortcuts;
mod tray;

use tauri::{AppHandle, Emitter};
use tauri_plugin_autostart::MacosLauncher;

fn run_capture_pipeline() -> Result<ocr::OcrCapture, String> {
    let captured = capture::capture_game_or_screen()?;
    let source = captured.source;
    let image = capture::downscale(captured.image, ocr::max_image_dimension());
    let (width, height) = (image.width(), image.height());
    let bgra = ocr::rgba_to_bgra(image.as_raw());
    let lines = ocr::recognize(&bgra, width, height)?;
    Ok(ocr::OcrCapture {
        source: source.to_string(),
        width,
        height,
        lines,
    })
}

#[tauri::command]
async fn capture_and_ocr() -> Result<ocr::OcrCapture, String> {
    tauri::async_runtime::spawn_blocking(run_capture_pipeline)
        .await
        .map_err(|e| e.to_string())?
}

pub(crate) fn on_capture_hotkey(app: &AppHandle) {
    let app = app.clone();
    tauri::async_runtime::spawn_blocking(move || {
        // Erst capturen (solange SC im Vordergrund ist), dann Fenster zeigen.
        let result = run_capture_pipeline();
        match result {
            Ok(capture) => {
                let _ = app.emit("capture-ocr", capture);
            }
            Err(error) => {
                let _ = app.emit("capture-ocr-error", error);
            }
        }
        tray::show_main_window(&app);
    });
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        // Zweitstart holt das bestehende Fenster nach vorn statt neu zu öffnen
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            tray::show_main_window(app);
        }))
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_store::Builder::default().build())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_autostart::init(
            MacosLauncher::LaunchAgent,
            None,
        ))
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_process::init())
        .setup(|app| {
            tray::setup(app.handle())?;
            shortcuts::register_from_settings(app.handle());
            Ok(())
        })
        // Close-to-Tray: Fenster verstecken, App läuft für Countdown-
        // Benachrichtigungen weiter; Beenden über das Tray-Menü.
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                api.prevent_close();
                let _ = window.hide();
            }
        })
        .invoke_handler(tauri::generate_handler![
            capture_and_ocr,
            secrets::secret_get,
            secrets::secret_set,
            secrets::secret_delete,
            shortcuts::set_capture_shortcut,
            shortcuts::get_capture_shortcut,
            elevation::get_game_elevation_status
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
