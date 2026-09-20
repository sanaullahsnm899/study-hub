import { Pool, types, type QueryResultRow } from "pg";

// bigint (int8) arrives as a string by default. File sizes and counters are far
// below Number.MAX_SAFE_INTEGER, so returning numbers keeps the app types honest.
types.setTypeParser(20, (value) => (value === null ? null : Number(value)));

declare global {
  var __studyhubPool: Pool | undefined;
}

function createPool() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error(
      "DATABASE_URL is not set. Copy .env.example to .env.local and configure your Postgres connection.",
    );
  }
  const needsSsl =
    /supabase|neon|render|amazonaws|vercel|sslmode=require/i.test(connectionString) &&
    !/sslmode=disable/i.test(connectionString);
  return new Pool({
    connectionString,
    max: Number(process.env.PG_POOL_MAX || 5),
    idleTimeoutMillis: 20_000,
    connectionTimeoutMillis: 10_000,
    ssl: needsSsl ? { rejectUnauthorized: false } : undefined,
  });
}

export function getPool(): Pool {
  if (!global.__studyhubPool) {
    const pool = createPool();
    // node-postgres emits 'error' on the pool for problems with idle clients in
    // the background (a dropped connection, a bad password) — separate from any
    // query's own promise. With no listener here, that event becomes an uncaught
    // exception and takes down the whole request, even ones with their own
    // try/catch. Logging it keeps a bad connection from crashing good ones.
    pool.on("error", (err) => {
      console.error("[db] Unexpected error on idle client:", err.message);
    });
    global.__studyhubPool = pool;
  }
  return global.__studyhubPool;
}

export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params: unknown[] = [],
): Promise<T[]> {
  const res = await getPool().query<T>(text, params as never[]);
  return res.rows;
}

export async function queryOne<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params: unknown[] = [],
): Promise<T | null> {
  const rows = await query<T>(text, params);
  return rows[0] ?? null;
}

export async function withTransaction<T>(fn: (client: import("pg").PoolClient) => Promise<T>) {
  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    const out = await fn(client);
    await client.query("COMMIT");
    return out;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}
