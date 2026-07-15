use std::thread::sleep;
use std::time::Duration;

use xcap::image::imageops::FilterType;
use xcap::image::RgbaImage;
use xcap::{Monitor, Window};

/// Anzahl Frames pro Erfassung. Ein einzelner Screenshot verliest durch
/// Glow/Animation/Laufschrift zufällig; mehrere Frames + Voting im Frontend
/// (merge-work-orders.ts) stimmen Ausreißer weg und decken die Laufschrift
/// langer Namen über die Zeit ab.
const FRAME_COUNT: usize = 5;
/// Abstand zwischen den Aufnahmen — spreizt die Frames über die Zeit,
/// damit die Laufschrift zwischen den Aufnahmen weiterwandert.
const FRAME_INTERVAL: Duration = Duration::from_millis(250);

/// OS-Level-Screenshot des Star-Citizen-Fensters (Fallback: primärer
/// Monitor). Bewusst NUR Screen-Capture — niemals Prozess-Memory lesen
/// oder in den Spielprozess eingreifen (Anti-Cheat-Grenze, CLAUDE.md).
pub struct Captured {
    pub image: RgbaImage,
    pub source: &'static str,
}

pub fn is_star_citizen_window(title: &str) -> bool {
    title.to_lowercase().contains("star citizen")
}

/// Zielgröße unter `max` Kantenlänge bei erhaltenem Seitenverhältnis —
/// Windows-OCR verweigert Bilder über OcrEngine::MaxImageDimension.
pub fn fit_within(width: u32, height: u32, max: u32) -> (u32, u32) {
    let largest = width.max(height);
    if largest <= max {
        return (width, height);
    }
    let scale = f64::from(max) / f64::from(largest);
    let scaled_w = (f64::from(width) * scale).floor() as u32;
    let scaled_h = (f64::from(height) * scale).floor() as u32;
    (scaled_w.max(1), scaled_h.max(1))
}

/// PID des Star-Citizen-Prozesses, falls ein Spielfenster existiert
/// (auch minimiert — für die Elevation-Warnung zählt der Prozess).
pub fn star_citizen_pid() -> Option<u32> {
    Window::all().ok()?.into_iter().find_map(|window| {
        let title = window.title().unwrap_or_default();
        if is_star_citizen_window(&title) {
            window.pid().ok()
        } else {
            None
        }
    })
}

pub fn capture_game_or_screen() -> Result<Captured, String> {
    if let Ok(windows) = Window::all() {
        for window in windows {
            let title = window.title().unwrap_or_default();
            if is_star_citizen_window(&title) && !window.is_minimized().unwrap_or(true) {
                if let Ok(image) = window.capture_image() {
                    return Ok(Captured {
                        image,
                        source: "window",
                    });
                }
            }
        }
    }

    let monitor = Monitor::all()
        .map_err(|e| e.to_string())?
        .into_iter()
        .find(|monitor| monitor.is_primary().unwrap_or(false))
        .ok_or_else(|| "no primary monitor found".to_string())?;
    let image = monitor.capture_image().map_err(|e| e.to_string())?;
    Ok(Captured {
        image,
        source: "monitor",
    })
}

/// Fasst die Einzel-Ergebnisse eines Frame-Bursts zusammen: alle
/// erfolgreichen Frames behalten, einzelne fehlgeschlagene Aufnahmen
/// tolerieren. Nur wenn kein einziger Frame gelang, den letzten Fehler
/// zurückgeben. Generisch → ohne echte Screenshots testbar.
fn collect_frames<T>(results: Vec<Result<T, String>>) -> Result<Vec<T>, String> {
    let mut frames = Vec::new();
    let mut last_error = None;
    for result in results {
        match result {
            Ok(frame) => frames.push(frame),
            Err(error) => last_error = Some(error),
        }
    }
    if frames.is_empty() {
        Err(last_error.unwrap_or_else(|| "no frames captured".to_string()))
    } else {
        Ok(frames)
    }
}

/// Nimmt `FRAME_COUNT` Screenshots über ~1,2 s auf (Abstand
/// `FRAME_INTERVAL`), solange Star Citizen im Vordergrund ist. Einzelne
/// fehlgeschlagene Aufnahmen werden toleriert; schlägt alles fehl, wird
/// der Fehler propagiert.
pub fn capture_frames() -> Result<Vec<Captured>, String> {
    let mut results = Vec::with_capacity(FRAME_COUNT);
    for index in 0..FRAME_COUNT {
        if index > 0 {
            sleep(FRAME_INTERVAL);
        }
        results.push(capture_game_or_screen());
    }
    collect_frames(results)
}

pub fn downscale(image: RgbaImage, max: u32) -> RgbaImage {
    let (target_w, target_h) = fit_within(image.width(), image.height(), max);
    if (target_w, target_h) == (image.width(), image.height()) {
        return image;
    }
    xcap::image::imageops::resize(&image, target_w, target_h, FilterType::Triangle)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn detects_star_citizen_window_titles() {
        assert!(is_star_citizen_window("Star Citizen"));
        assert!(is_star_citizen_window("STAR CITIZEN — LIVE"));
        assert!(!is_star_citizen_window("RSI Launcher"));
        assert!(!is_star_citizen_window("starvein-companion"));
    }

    #[test]
    fn fit_within_keeps_small_images() {
        assert_eq!(fit_within(1920, 1080, 2600), (1920, 1080));
    }

    #[test]
    fn fit_within_scales_down_preserving_ratio() {
        let (w, h) = fit_within(3840, 2160, 2600);
        assert_eq!(w, 2600);
        assert_eq!(h, 1462);
    }

    #[test]
    fn fit_within_never_returns_zero() {
        assert_eq!(fit_within(10_000, 1, 2600), (2600, 1));
    }

    #[test]
    fn collect_frames_keeps_all_successful() {
        let results = vec![Ok(1), Ok(2), Ok(3)];
        assert_eq!(collect_frames(results), Ok(vec![1, 2, 3]));
    }

    #[test]
    fn collect_frames_tolerates_individual_failures() {
        let results = vec![Err("x".to_string()), Ok(2), Err("y".to_string())];
        assert_eq!(collect_frames(results), Ok(vec![2]));
    }

    #[test]
    fn collect_frames_propagates_when_all_fail() {
        let results: Vec<Result<i32, String>> =
            vec![Err("first".to_string()), Err("last".to_string())];
        assert_eq!(collect_frames(results), Err("last".to_string()));
    }

    #[test]
    fn collect_frames_errors_on_empty() {
        let results: Vec<Result<i32, String>> = vec![];
        assert_eq!(collect_frames(results), Err("no frames captured".to_string()));
    }

    #[test]
    fn burst_takes_several_frames() {
        assert!(FRAME_COUNT >= 3);
    }
}
