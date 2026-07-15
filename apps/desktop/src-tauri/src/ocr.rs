use serde::Serialize;
use windows::core::HSTRING;
use windows::Globalization::Language;
use windows::Graphics::Imaging::{BitmapPixelFormat, SoftwareBitmap};
use windows::Media::Ocr::OcrEngine;
use windows::Storage::Streams::DataWriter;

#[derive(Serialize, Clone, Debug)]
pub struct OcrWord {
    pub text: String,
    pub x: f32,
    pub y: f32,
    pub width: f32,
    pub height: f32,
}

#[derive(Serialize, Clone, Debug)]
pub struct OcrLine {
    pub text: String,
    pub words: Vec<OcrWord>,
}

#[derive(Serialize, Clone, Debug)]
pub struct OcrCapture {
    pub source: String,
    pub width: u32,
    pub height: u32,
    pub lines: Vec<OcrLine>,
}

/// Windows-OCR erwartet Bgra8 — xcap liefert RGBA, also R/B tauschen.
pub fn rgba_to_bgra(rgba: &[u8]) -> Vec<u8> {
    let mut bgra = rgba.to_vec();
    for pixel in bgra.chunks_exact_mut(4) {
        pixel.swap(0, 2);
    }
    bgra
}

fn create_engine() -> Result<OcrEngine, String> {
    // Die Spieltexte sind englisch — eine installierte EN-Engine liest sie
    // deutlich sauberer als z. B. die de-DE-Engine (typische Verleser:
    // QUALITY→OUALITY, 575→S7S). Fallback: Profilsprachen, damit die
    // Erfassung auch ohne englisches OCR-Sprachpaket funktioniert.
    for tag in ["en-US", "en"] {
        if let Ok(language) = Language::CreateLanguage(&HSTRING::from(tag)) {
            if let Ok(engine) = OcrEngine::TryCreateFromLanguage(&language) {
                return Ok(engine);
            }
        }
    }
    OcrEngine::TryCreateFromUserProfileLanguages().map_err(|e| e.to_string())
}

pub fn max_image_dimension() -> u32 {
    OcrEngine::MaxImageDimension().unwrap_or(2600)
}

pub fn recognize(bgra: &[u8], width: u32, height: u32) -> Result<Vec<OcrLine>, String> {
    let writer = DataWriter::new().map_err(|e| e.to_string())?;
    writer.WriteBytes(bgra).map_err(|e| e.to_string())?;
    let buffer = writer.DetachBuffer().map_err(|e| e.to_string())?;

    let bitmap = SoftwareBitmap::CreateCopyFromBuffer(
        &buffer,
        BitmapPixelFormat::Bgra8,
        width as i32,
        height as i32,
    )
    .map_err(|e| e.to_string())?;

    let engine = create_engine()?;
    let result = engine
        .RecognizeAsync(&bitmap)
        .map_err(|e| e.to_string())?
        .join()
        .map_err(|e| e.to_string())?;

    let mut lines = Vec::new();
    for line in result.Lines().map_err(|e| e.to_string())? {
        let mut words = Vec::new();
        for word in line.Words().map_err(|e| e.to_string())? {
            let rect = word.BoundingRect().map_err(|e| e.to_string())?;
            words.push(OcrWord {
                text: word.Text().map_err(|e| e.to_string())?.to_string(),
                x: rect.X,
                y: rect.Y,
                width: rect.Width,
                height: rect.Height,
            });
        }
        lines.push(OcrLine {
            text: line.Text().map_err(|e| e.to_string())?.to_string(),
            words,
        });
    }
    Ok(lines)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn rgba_to_bgra_swaps_red_and_blue() {
        let rgba = [10, 20, 30, 255, 1, 2, 3, 4];
        assert_eq!(rgba_to_bgra(&rgba), vec![30, 20, 10, 255, 3, 2, 1, 4]);
    }
}
