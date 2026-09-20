import { readFileSync } from "node:fs";
import path from "node:path";
import { loadEnv } from "./env";

loadEnv();

async function main() {
  const { getPool } = await import("../src/lib/db");
  const sql = readFileSync(path.join(process.cwd(), "db", "schema.sql"), "utf8");
  const pool = getPool();
  await pool.query(sql);
  console.log("✓ Schema applied");
  await pool.end();
}

main().catch((err) => {
  console.error("✕ Migration failed:", err.message);
  process.exit(1);
});
