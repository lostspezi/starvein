"use client";

import { useTranslations } from "next-intl";
import { signIn, signOut, useSession } from "@/lib/auth-client";
import { Link } from "@/i18n/navigation";

export function UserMenu() {
  const t = useTranslations("auth");
  const { data: session, isPending } = useSession();

  if (isPending) {
    return null;
  }

  if (!session) {
    return (
      <button
        type="button"
        onClick={() => signIn.social({ provider: "discord", callbackURL: "/" })}
        className="rounded bg-accent-primary px-3 py-1.5 text-sm font-medium text-bg-void hover:bg-accent-glow"
      >
        {t("signInDiscord")}
      </button>
    );
  }

  return (
    <div className="flex items-center gap-3 text-sm">
      <Link
        href="/favorites"
        className="text-text-muted hover:text-text-primary"
      >
        {t("myFavorites")}
      </Link>
      <span className="hidden font-medium sm:inline">{session.user.name}</span>
      <button
        type="button"
        onClick={() => signOut()}
        className="rounded px-2 py-1 text-text-muted hover:bg-bg-nebula-2 hover:text-text-primary"
      >
        {t("signOut")}
      </button>
    </div>
  );
}
