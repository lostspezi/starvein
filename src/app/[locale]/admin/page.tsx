import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { AdminTimeoutsTable } from "@/features/moderation/AdminTimeoutsTable";
import { AdminUsersTable } from "@/features/moderation/AdminUsersTable";
import { listActiveTimeouts } from "@/features/moderation/timeouts.repository";
import { listUsers } from "@/features/moderation/users.repository";
import { PageHeader } from "@/lib/components/ui/PageHeader";
import { PageShell } from "@/lib/components/ui/PageShell";
import { getDb } from "@/lib/db";
import { getSessionUser } from "@/lib/session";
import { NO_INDEX } from "@/lib/seo";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "meta" });
  return { title: t("admin.title"), robots: NO_INDEX };
}

export default async function AdminPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  // Anonyme UND Nicht-Admins bekommen 404 — die Seite verrät ihre
  // Existenz nicht (kein Login-Hinweis wie bei Favoriten).
  const user = await getSessionUser(await headers());
  if (user?.role !== "admin") {
    notFound();
  }

  const t = await getTranslations("admin");
  const db = await getDb();
  const [users, timeouts] = await Promise.all([
    listUsers(db),
    listActiveTimeouts(db, new Date().toISOString()),
  ]);

  return (
    <PageShell>
      <PageHeader title={t("title")} />
      <section className="space-y-2">
        <h2 className="text-sm font-medium text-text-primary">
          {t("usersTitle")}
        </h2>
        <AdminUsersTable users={users} currentUserId={user.id} />
      </section>
      <section className="mt-8 space-y-2">
        <h2 className="text-sm font-medium text-text-primary">
          {t("timeoutsTitle")}
        </h2>
        <AdminTimeoutsTable timeouts={timeouts} />
      </section>
    </PageShell>
  );
}
