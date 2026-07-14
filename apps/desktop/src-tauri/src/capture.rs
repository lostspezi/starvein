use xcap::image::imageops::FilterType;
use xcap::image::RgbaImage;
use xcap::{Monitor, Window};

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
}
