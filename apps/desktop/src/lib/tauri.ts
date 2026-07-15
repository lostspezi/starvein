import { invoke } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";

/** Typen spiegeln die serde-Structs in src-tauri/src/ocr.rs. */
export type OcrWord = {
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
};

export type OcrLine = {
  text: string;
  words: OcrWord[];
};

export type OcrCapture = {
  source: "window" | "monitor";
  width: number;
  height: number;
  /**
   * OCR-Zeilen des ersten Frames — bleibt für Debug-Panel und Altpfade
   * erhalten (identisch zu `frames[0]`).
   */
  lines: OcrLine[];
  /**
   * Alle Frames eines Multi-Frame-Bursts (mehrere Screenshots über ~1,2 s).
   * Das Formular parst jeden Frame und merged per Voting (robuster gegen
   * Glow/Animation/Laufschrift). Ältere Backends ohne dieses Feld liefern
   * nur `lines`; Konsumenten fallen dann auf `[lines]` zurück.
   */
  frames?: OcrLine[][];
};

/** Alle Frames eines Captures — Fallback auf den Einzelframe `lines`. */
export function captureFrames(capture: OcrCapture): OcrLine[][] {
  return capture.frames && capture.frames.length > 0
    ? capture.frames
    : [capture.lines];
}

export function captureAndOcr(): Promise<OcrCapture> {
  return invoke<OcrCapture>("capture_and_ocr");
}

export function onCaptureResult(
  handler: (capture: OcrCapture) => void,
): Promise<UnlistenFn> {
  return listen<OcrCapture>("capture-ocr", (event) => handler(event.payload));
}

export function onCaptureError(
  handler: (message: string) => void,
): Promise<UnlistenFn> {
  return listen<string>("capture-ocr-error", (event) => handler(event.payload));
}
