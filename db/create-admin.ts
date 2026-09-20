import { createInterface } from "node:readline/promises";
import { loadEnv } from "./env";

loadEnv();

/**
 * Create or reset the administrator account.
 *   npm run admin:create -- admin@example.com "Strong Password" "Ayesha Khan"
 * With no arguments it prompts interactively so the password stays out of shell history.
 */
async function main() {
  const { getPool } = await import("../src/lib/db");
  const { upsertAdmin } = await import("../src/lib/repo/admins");

  let [email, password, name] = process.argv.slice(2);
  if (!email || !password) {
    const rl = createInterface({ input: process.stdin, output: process.stdout });
    email = email || (await rl.question("Admin email: "));
    password = password || (await rl.question("Password (min 8 chars): "));
    name = name || (await rl.question("Display name [Administrator]: "));
    rl.close();
  }
  if (!email.includes("@")) throw new Error("That does not look like an email address.");
  if (!password || password.length < 8) throw new Error("Password must be at least 8 characters.");

  const admin = await upsertAdmin(email.trim().toLowerCase(), name?.trim() || "Administrator", password);
  console.log(`✓ Admin ready: ${admin?.email}`);
  await getPool().end();
}

main().catch((err) => {
  console.error("✕", err.message);
  process.exit(1);
});
