import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getSessionUserId } from "@/lib/session";
import { isDashboardAdminUser } from "@/features/admin-dashboard/admin-access.service";
import { enforceReadRateLimit } from "@/lib/read-rate-limit";

export const dynamic = "force-dynamic";

/**
 * Sagt dem Client (UserMenu), ob die aktuelle Session Dashboard-Admin ist —
 * damit der Nav-Link nur für Berechtigte erscheint. Anonyme Anfragen ⇒ 401;
 * angemeldete Nicht-Admins ⇒ 200 { allowed: false }.
 */
export async function GET(request: Request): Promise<NextResponse> {
  const limited = await enforceReadRateLimit(request, "admin-dashboard-access");
  if (limited) return limited;

  const userId = await getSessionUserId(request.headers);
  if (!userId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const db = await getDb();
  const allowed = await isDashboardAdminUser(db, userId);
  return NextResponse.json({ allowed });
}
