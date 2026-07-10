"use client";

import { useTranslations } from "next-intl";
import { toRole } from "@/features/moderation/roles";
import { signIn, signOut, useSession } from "@/lib/auth-client";
import { Link } from "@/i18n/navigation";
import { Button } from "@/lib/components/ui/Button";

export function UserMenu() {
  const t = useTranslations("auth");
  const { data: session, isPending } = useSession();

  if (isPending) {
    return null;
  }

  if (!session) {
    return (
      <Button
        onClick={() => signIn.social({ provider: "discord", callbackURL: "/" })}
      >
        {t("signInDiscord")}
      </Button>
    );
  }

  const isAdmin = toRole((session.user as { role?: unknown }).role) === "admin";

  return (
    <div className="flex items-center gap-3 text-sm">
      {isAdmin && (
        <Link
          href="/admin"
          className="text-text-muted transition-colors duration-150 hover:text-text-primary"
        >
          {t("adminLink")}
        </Link>
      )}
      <Link
        href="/favorites"
        className="text-text-muted transition-colors duration-150 hover:text-text-primary"
      >
        {t("myFavorites")}
      </Link>
      <span className="hidden font-medium sm:inline">{session.user.name}</span>
      <Button variant="ghost" className="px-2 py-1" onClick={() => signOut()}>
        {t("signOut")}
      </Button>
    </div>
  );
}
