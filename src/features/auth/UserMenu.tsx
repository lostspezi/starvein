"use client";

import { useId, useRef, useState, useSyncExternalStore } from "react";
import { ChevronDown } from "lucide-react";
import { useTranslations } from "next-intl";
import { toRole } from "@/features/moderation/roles";
import { signIn, signOut, useSession } from "@/lib/auth-client";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/cn";
import { Button } from "@/lib/components/ui/Button";
import { panelClasses } from "@/lib/components/ui/Panel";

const itemClasses =
  "block w-full px-3 py-2 text-left text-sm text-text-muted transition-colors duration-150 hover:bg-bg-nebula-2 hover:text-text-primary";

// Stabile no-op-Subscription für useSyncExternalStore (kein Re-Subscribe).
const noopSubscribe = () => () => {};

function Avatar({ image, name }: { image?: string | null; name: string }) {
  if (image) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- 32px-Remote-Avatar von Discord, next/image lohnt hier nicht
      <img
        src={image}
        alt=""
        width={32}
        height={32}
        referrerPolicy="no-referrer"
        className="size-8 rounded-full"
      />
    );
  }

  return (
    <span
      aria-hidden
      className="flex size-8 items-center justify-center rounded-full bg-accent-primary font-medium text-bg-void"
    >
      {name.charAt(0).toUpperCase() || "?"}
    </span>
  );
}

export function UserMenu() {
  const t = useTranslations("auth");
  const { data: session, isPending } = useSession();
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelId = useId();

  // useSession hydratisiert auf dem Client synchron aus dem Cookie-Cache,
  // auf dem Server ist es pending → null. Ohne Guard unterscheiden sich
  // Server- und erster Client-Render → Hydration-Mismatch. useSyncExternalStore
  // liefert bei SSR + Hydration den Server-Snapshot (false), danach den
  // Client-Wert (true) — das echte Menü erscheint erst nach der Hydration.
  const hydrated = useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );

  if (!hydrated || isPending) {
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
  const name = session.user.name;

  return (
    <div
      className="relative"
      onKeyDown={(event) => {
        if (event.key === "Escape" && open) {
          setOpen(false);
          triggerRef.current?.focus();
        }
      }}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node)) {
          setOpen(false);
        }
      }}
    >
      <button
        ref={triggerRef}
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        aria-label={t("userMenu", { name })}
        onClick={() => setOpen((previous) => !previous)}
        className="flex items-center gap-2 rounded-full"
      >
        <Avatar image={session.user.image} name={name} />
        <span className="hidden text-sm font-medium sm:inline">{name}</span>
        <ChevronDown
          aria-hidden
          className={cn(
            "size-4 text-text-muted transition-transform duration-150",
            open && "rotate-180",
          )}
        />
      </button>
      {open && (
        <div
          id={panelId}
          className={cn(
            panelClasses({ variant: "glass" }),
            "absolute right-0 top-full z-10 mt-2 w-44 animate-reveal py-1 shadow-lg",
          )}
        >
          {isAdmin && (
            <Link
              href="/admin"
              className={itemClasses}
              onClick={() => setOpen(false)}
            >
              {t("adminLink")}
            </Link>
          )}
          <Link
            href="/favorites"
            className={itemClasses}
            onClick={() => setOpen(false)}
          >
            {t("myFavorites")}
          </Link>
          <Link
            href="/loadouts/mine"
            className={itemClasses}
            onClick={() => setOpen(false)}
          >
            {t("myLoadouts")}
          </Link>
          <Link
            href="/guides/mine"
            className={itemClasses}
            onClick={() => setOpen(false)}
          >
            {t("myGuides")}
          </Link>
          <Link
            href="/refinery-jobs"
            className={itemClasses}
            onClick={() => setOpen(false)}
          >
            {t("myRefineryJobs")}
          </Link>
          <Link
            href="/warehouse"
            className={itemClasses}
            onClick={() => setOpen(false)}
          >
            {t("myWarehouse")}
          </Link>
          <button
            type="button"
            className={itemClasses}
            onClick={() => {
              setOpen(false);
              signOut();
            }}
          >
            {t("signOut")}
          </button>
        </div>
      )}
    </div>
  );
}
