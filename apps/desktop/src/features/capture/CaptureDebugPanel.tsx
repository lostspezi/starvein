import { useState } from "react";
import { useTranslations } from "use-intl";
import { captureAndOcr, type OcrCapture } from "../../lib/tauri";

type PanelState =
  | { kind: "idle" }
  | { kind: "busy" }
  | { kind: "result"; capture: OcrCapture }
  | { kind: "error"; message: string };

/**
 * Debug-Ansicht der rohen OCR-Pipeline (Slice D4): zeigt, was Hotkey bzw.
 * Test-Button vom Refinery-Terminal lesen. Ab D5 speist das Ergebnis das
 * Bestätigungsformular; dieses Panel bleibt fürs Feintuning erhalten.
 */
export function CaptureDebugPanel() {
  const t = useTranslations("capture");
  const [state, setState] = useState<PanelState>({ kind: "idle" });

  async function runManualCapture() {
    setState({ kind: "busy" });
    try {
      setState({ kind: "result", capture: await captureAndOcr() });
    } catch (error) {
      setState({ kind: "error", message: String(error) });
    }
  }

  return (
    <details className="border-glass-border bg-glass w-full max-w-2xl rounded-lg border p-3 backdrop-blur-md">
      <summary className="text-text-muted cursor-pointer text-xs tracking-wide">
        {t("debugTitle")}
      </summary>
      <div className="mt-3 flex flex-col gap-3">
        <p className="text-text-muted text-xs">{t("hotkeyHint")}</p>
        <button
          type="button"
          disabled={state.kind === "busy"}
          onClick={() => void runManualCapture()}
          className="bg-bg-nebula-2 text-text-primary hover:shadow-glow-sm w-fit rounded px-3 py-1.5 text-xs transition-all duration-200 disabled:opacity-50"
        >
          {t("trigger")}
        </button>

        {state.kind === "error" && (
          <p className="text-warning text-xs" role="alert">
            {t("error", { message: state.message })}
          </p>
        )}
        {state.kind === "result" && (
          <>
            <p className="text-text-muted text-xs">
              {t("meta", {
                source: state.capture.source,
                size: `${state.capture.width} × ${state.capture.height}`,
              })}
            </p>
            {state.capture.lines.length === 0 ? (
              <p className="text-text-muted text-xs">{t("noText")}</p>
            ) : (
              <ul className="flex max-h-64 flex-col gap-1 overflow-y-auto">
                {state.capture.lines.map((line, index) => (
                  <li
                    key={`${index}-${line.text}`}
                    className="text-text-primary font-mono text-xs"
                  >
                    {line.text}
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </div>
    </details>
  );
}
