import { readFileSync } from "node:fs";
import path from "node:path";
import { loadEnv } from "../db/env";

/** Applies the real schema to the throwaway test database once per run. */
export default async function setup() {
  loadEnv([".env.test"]);
  const { getPool } = await import("../src/lib/db");
  const pool = getPool();
  await pool.query(readFileSync(path.join(process.cwd(), "db", "schema.sql"), "utf8"));
  await pool.end();
}
