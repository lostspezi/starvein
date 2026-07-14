import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "use-intl";
import { AppFooter } from "./components/AppFooter";
import { LoginScreen } from "./features/login/LoginScreen";
import { clearSessionToken, getSessionToken } from "./lib/secrets";
import {
  fetchSessionUser,
  revokeSession,
  type SessionUser,
} from "./lib/session";

type AuthState =
  | { phase: "loading" }
  | { phase: "loggedOut" }
  | { phase: "loggedIn"; token: string; user: SessionUser };

export function App() {
  const t = useTranslations("shell");
  const [auth, setAuth] = useState<AuthState>({ phase: "loading" });

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

  async function signOut() {
    if (auth.phase === "loggedIn") {
      await revokeSession(auth.token);
    }
    await clearSessionToken();
    setAuth({ phase: "loggedOut" });
  }

  return (
    <div className="flex h-screen flex-col">
      <header className="border-glass-border bg-glass flex items-center justify-between border-b px-4 py-3 backdrop-blur-md">
        <h1 className="text-accent-cyan font-mono text-sm tracking-[0.3em]">
          STARVEIN <span className="text-text-muted">COMPANION</span>
        </h1>
        {auth.phase === "loggedIn" && (
          <div className="flex items-center gap-3 text-sm">
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
          </div>
        )}
      </header>

      {auth.phase === "loading" && (
        <main className="flex flex-1 items-center justify-center p-6">
          <p className="text-text-muted text-sm">{t("loading")}</p>
        </main>
      )}
      {auth.phase === "loggedOut" && (
        <LoginScreen onAuthenticated={(token) => void adoptToken(token)} />
      )}
      {auth.phase === "loggedIn" && (
        <main className="flex flex-1 items-center justify-center overflow-y-auto p-6">
          <p className="text-text-muted max-w-prose text-center text-sm">
            {t("skeleton.placeholder")}
          </p>
        </main>
      )}

      <AppFooter />
    </div>
  );
}
