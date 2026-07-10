/**
 * Rollen-Bootstrap: setzt die Rolle eines Users per E-Mail — die einzige
 * Möglichkeit, "admin" zu vergeben oder zu entziehen (die API kann das
 * bewusst nicht, siehe moderation.service.ts).
 *
 * Aufruf: pnpm promote <email> [role]   (role default: admin)
 */
import { ROLES, type Role } from "@/features/moderation/roles";
import { setUserRoleByEmail } from "@/features/moderation/users.repository";
import { closeMongo, getDb } from "@/lib/db";

async function main() {
  const email = process.argv[2];
  const role = (process.argv[3] ?? "admin") as Role;

  if (!email) {
    console.error("Usage: pnpm promote <email> [role]");
    process.exitCode = 1;
    return;
  }
  if (!ROLES.includes(role)) {
    console.error(
      `Unknown role "${role}" — expected one of: ${ROLES.join(", ")}`,
    );
    process.exitCode = 1;
    return;
  }

  const db = await getDb();
  const matched = await setUserRoleByEmail(db, email, role);
  if (matched) {
    console.log(`OK: ${email} is now "${role}".`);
  } else {
    console.error(
      `No user found for ${email} — sign in once via Discord first.`,
    );
    process.exitCode = 1;
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => closeMongo());
