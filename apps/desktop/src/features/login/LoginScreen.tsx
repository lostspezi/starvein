import { useState } from "react";
import { openUrl } from "@tauri-apps/plugin-opener";
import { useTranslations } from "use-intl";
import { SERVER_URL } from "../../lib/config";
import { fetch } from "../../lib/http";
import { setSessionToken } from "../../lib/secrets";
import {
  DeviceFlowError,
  pollForToken,
  requestDeviceCode,
  type DeviceCode,
} from "./device-flow";

type LoginState =
  | { phase: "idle" }
  | { phase: "waiting"; code: DeviceCode }
  | { phase: "error"; reason: "denied" | "expired" | "protocol" };

const sleep = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));

/**
 * Discord-Login über den Device-Flow: Code anfordern, Bestätigungsseite im
 * System-Browser öffnen, Token pollen und im Credential Manager ablegen.
 */
export function LoginScreen({
  onAuthenticated,
}: {
  onAuthenticated: (token: string) => void;
}) {
  const t = useTranslations("login");
  const [state, setState] = useState<LoginState>({ phase: "idle" });

  async function startFlow() {
    try {
      const code = await requestDeviceCode({
        baseUrl: SERVER_URL,
        fetchFn: fetch,
      });
      setState({ phase: "waiting", code });
      void openUrl(code.verificationUriComplete);

      const token = await pollForToken({
        baseUrl: SERVER_URL,
        deviceCode: code.deviceCode,
        intervalSeconds: code.intervalSeconds,
        fetchFn: fetch,
        sleep,
      });
      await setSessionToken(token);
      onAuthenticated(token);
    } catch (error) {
      setState({
        phase: "error",
        reason:
          error instanceof DeviceFlowError ? error.code : ("protocol" as const),
      });
    }
  }

  return (
    <section className="flex flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
      <h2 className="text-accent-ice text-lg font-medium">{t("title")}</h2>
      <p className="text-text-muted max-w-sm text-sm">{t("intro")}</p>

      {state.phase === "waiting" ? (
        <>
          <p className="text-text-muted text-sm">{t("codeHint")}</p>
          <p className="text-accent-cyan font-mono text-3xl tracking-[0.2em]">
            {state.code.userCode}
          </p>
          <p className="text-text-muted animate-glow-pulse text-sm">
            {t("waiting")}
          </p>
          <button
            type="button"
            onClick={() => void openUrl(state.code.verificationUriComplete)}
            className="text-accent-primary hover:text-accent-glow text-sm transition-colors duration-150"
          >
            {t("reopenBrowser")}
          </button>
        </>
      ) : (
        <>
          {state.phase === "error" && (
            <p className="text-warning text-sm" role="alert">
              {t(`errors.${state.reason}`)}
            </p>
          )}
          <button
            type="button"
            onClick={() => void startFlow()}
            className="bg-accent-primary text-bg-void hover:bg-accent-glow hover:shadow-glow-primary rounded px-4 py-2 text-sm font-medium transition-all duration-200"
          >
            {t("connect")}
          </button>
        </>
      )}
    </section>
  );
}
