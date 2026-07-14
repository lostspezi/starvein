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
  lines: OcrLine[];
};

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
