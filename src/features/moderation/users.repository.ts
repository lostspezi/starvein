import { ObjectId, type Db } from "mongodb";
import { toRole, type Role } from "./roles";

// Better-Auth-Collection: _id ist ObjectId, session.user.id der Hex-String.
// Der Adapter mappt id <-> _id — hier machen wir dasselbe von Hand.
const COLLECTION = "user";

export type AdminUserListEntry = {
  id: string;
  name: string;
  email: string;
  role: Role;
};

export async function listUsers(
  db: Db,
  limit = 200,
): Promise<AdminUserListEntry[]> {
  const docs = await db
    .collection(COLLECTION)
    .find({}, { projection: { _id: 1, name: 1, email: 1, role: 1 } })
    .sort({ name: 1 })
    .limit(limit)
    .toArray();
  return docs.map((doc) => ({
    id: doc._id.toHexString(),
    name: String(doc.name ?? ""),
    email: String(doc.email ?? ""),
    role: toRole(doc.role),
  }));
}

/** Anzeigename für Attribution (z. B. Guide-Author im JSON-LD). */
export async function findUserNameById(
  db: Db,
  id: string,
): Promise<string | null> {
  if (!ObjectId.isValid(id)) return null;
  const doc = await db
    .collection(COLLECTION)
    .findOne({ _id: new ObjectId(id) }, { projection: { name: 1 } });
  const name = typeof doc?.name === "string" ? doc.name.trim() : "";
  return name.length > 0 ? name : null;
}

export async function getUserRole(db: Db, id: string): Promise<Role | null> {
  if (!ObjectId.isValid(id)) return null;
  const doc = await db
    .collection(COLLECTION)
    .findOne({ _id: new ObjectId(id) }, { projection: { role: 1 } });
  return doc ? toRole(doc.role) : null;
}

export async function setUserRole(
  db: Db,
  id: string,
  role: Role,
): Promise<void> {
  if (!ObjectId.isValid(id)) return;
  await db
    .collection(COLLECTION)
    .updateOne({ _id: new ObjectId(id) }, { $set: { role } });
}

/** Fürs promote-Skript: liefert false, wenn keine E-Mail matcht. */
export async function setUserRoleByEmail(
  db: Db,
  email: string,
  role: Role,
): Promise<boolean> {
  const result = await db
    .collection(COLLECTION)
    .updateOne({ email }, { $set: { role } });
  return result.matchedCount > 0;
}
