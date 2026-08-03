import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";

/**
 * Gemeinsamer Guard der Admin-Key-Routen: 401 ohne Session, 403 ohne
 * admin-Rolle, sonst null (Aufrufer fährt fort).
 */
export async function requireAdmin(
  headers: Headers,
): Promise<NextResponse | null> {
  const user = await getSessionUser(headers);
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (user.role !== "admin") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  return null;
}
