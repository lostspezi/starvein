import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "use-intl";
import { AppFooter } from "./components/AppFooter";
import { CaptureDebugPanel } from "./features/capture/CaptureDebugPanel";
import { CaptureFlow } from "./features/capture/CaptureFlow";
import { JobsPanel } from "./features/jobs/JobsPanel";
import { LoginScreen } from "./features/login/LoginScreen";
import { SettingsScreen } from "./features/settings/SettingsScreen";
import { UpdatePrompt } from "./features/update/UpdatePrompt";
import { clearSessionToken, getSessionToken } from "./lib/secrets";
import {
  fetchSessionUser,
  revokeSession,
  type SessionUser,
} from "./lib/session";
import { onCaptureError, onCaptureResult, type OcrCapture } from "./lib/tauri";
import { checkForUpdate, type AvailableUpdate } from "./lib/updater";

type AuthState =
  | { phase: "loading" }
  | { phase: "loggedOut" }
  | { phase: "loggedIn"; token: string; user: SessionUser };

export function App() {
  const t = useTranslations("shell");
  const tCapture = useTranslations("capture");
  const [auth, setAuth] = useState<AuthState>({ phase: "loading" });
  const [pendingCapture, setPendingCapture] = useState<OcrCapture | null>(null);
  const [captureError, setCaptureError] = useState<string | null>(null);
  const [jobsVersion, setJobsVersion] = useState(0);
  const [showSettings, setShowSettings] = useState(false);
  const [availableUpdate, setAvailableUpdate] =
    useState<AvailableUpdate | null>(null);
  const [updateBusy, setUpdateBusy] = useState(false);

  const adoptToken = useCallback(async (token: string) => {
    const user = await fetchSessionUser(token);
    if (!user) {
      await clearSessionToken();
      setAuth({ phase: "loggedOut" });
      return;
    }
    setAuth({ phase: "loggedIn", token, user });
  }, []);

  useEffect(() => {
    void (async () => {
      const token = await getSessionToken().catch(() => null);
      if (!token) {
        setAuth({ phase: "loggedOut" });
        return;
      }
      await adoptToken(token);
    })();
  }, [adoptToken]);

  // Update-Check beim Start: neue Version gefunden → einmalig fragen;
  // "Später" oder Fehler lassen die App normal weiterlaufen.
  useEffect(() => {
    let cancelled = false;
    checkForUpdate()
      .then((update) => {
        if (!cancelled) {
          setAvailableUpdate(update);
        }
      })
      .catch(() => {
        // Offline oder Endpoint nicht erreichbar — still weiterlaufen.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function installUpdate() {
    if (!availableUpdate) {
      return;
    }
    setUpdateBusy(true);
    try {
      // Erfolgreiche Installation startet die App neu (relaunch).
      await availableUpdate.install();
    } catch {
      setUpdateBusy(false);
      setAvailableUpdate(null);
    }
  }

  // Hotkey-Erfassungen aus Rust: Ergebnis öffnet das Bestätigungsformular.
  useEffect(() => {
    const unlistenResult = onCaptureResult((capture) => {
      setCaptureError(null);
      setPendingCapture(capture);
    });
    const unlistenError = onCaptureError((message) => {
      setCaptureError(message);
    });
    return () => {
      void unlistenResult.then((unlisten) => unlisten());
      void unlistenError.then((unlisten) => unlisten());
    };
  }, []);

  async function signOut() {
    if (auth.phase === "loggedIn") {
      await revokeSession(auth.token);
    }
    await clearSessionToken();
    setPendingCapture(null);
    setAuth({ phase: "loggedOut" });
  }

  return (
    <div className="flex h-screen flex-col">
      {availableUpdate && (
        <UpdatePrompt
          version={availableUpdate.version}
          busy={updateBusy}
          onInstall={() => void installUpdate()}
          onDismiss={() => setAvailableUpdate(null)}
        />
      )}
      <header className="border-glass-border bg-glass flex items-center justify-between border-b px-4 py-3 backdrop-blur-md">
        <h1 className="text-accent-cyan font-mono text-sm tracking-[0.3em]">
          STARVEIN <span className="text-text-muted">COMPANION</span>
        </h1>
        <div className="flex items-center gap-3 text-sm">
          {auth.phase === "loggedIn" && (
            <>
              <span className="text-text-muted">
                {t("session.signedInAs", { name: auth.user.name })}
              </span>
              <button
                type="button"
                onClick={() => void signOut()}
                className="text-text-muted hover:bg-bg-nebula-2 hover:text-text-primary rounded px-2 py-1 transition-colors duration-150"
              >
                {t("session.signOut")}
              </button>
            </>
          )}
          <button
            type="button"
            aria-label={t("settings")}
            onClick={() => setShowSettings((current) => !current)}
            className="text-text-muted hover:bg-bg-nebula-2 hover:text-text-primary rounded px-2 py-1 transition-colors duration-150"
          >
            ⚙
          </button>
        </div>
      </header>

      {auth.phase === "loading" && (
        <main className="flex flex-1 items-center justify-center p-6">
          <p className="text-text-muted text-sm">{t("loading")}</p>
        </main>
      )}
      {auth.phase !== "loading" && showSettings && (
        <main className="flex flex-1 flex-col items-center gap-4 overflow-y-auto p-6">
          <SettingsScreen onClose={() => setShowSettings(false)} />
        </main>
      )}
      {auth.phase === "loggedOut" && !showSettings && (
        <LoginScreen onAuthenticated={(token) => void adoptToken(token)} />
      )}
      {auth.phase === "loggedIn" && !showSettings && (
        <main className="flex flex-1 flex-col items-center gap-4 overflow-y-auto p-6">
          {captureError && (
            <p className="text-warning text-sm" role="alert">
              {tCapture("error", { message: captureError })}
            </p>
          )}
          {pendingCapture ? (
            <CaptureFlow
              token={auth.token}
              capture={pendingCapture}
              onCreated={() => {
                setPendingCapture(null);
                setJobsVersion((version) => version + 1);
              }}
              onCancel={() => setPendingCapture(null)}
            />
          ) : (
            <>
              <JobsPanel
                key={jobsVersion}
                token={auth.token}
                onUnauthorized={() => void signOut()}
              />
              <CaptureDebugPanel />
            </>
          )}
        </main>
      )}

      <AppFooter />
    </div>
  );
}
