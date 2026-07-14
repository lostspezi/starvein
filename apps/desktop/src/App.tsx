import { useTranslations } from "use-intl";
import { AppFooter } from "./components/AppFooter";

export function App() {
  const t = useTranslations("shell");

  return (
    <div className="flex h-screen flex-col">
      <header className="border-glass-border bg-glass border-b px-4 py-3 backdrop-blur-md">
        <h1 className="text-accent-cyan font-mono text-sm tracking-[0.3em]">
          STARVEIN <span className="text-text-muted">COMPANION</span>
        </h1>
      </header>
      <main className="flex flex-1 items-center justify-center overflow-y-auto p-6">
        <p className="text-text-muted max-w-prose text-center text-sm">
          {t("skeleton.placeholder")}
        </p>
      </main>
      <AppFooter />
    </div>
  );
}
