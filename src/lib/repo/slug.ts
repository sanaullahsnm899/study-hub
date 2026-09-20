import { query } from "../db";
import { slugify } from "../utils";

/** Generate a slug that is unique within `table`, appending -2, -3… when needed. */
export async function uniqueSlug(
  table: "semesters" | "subjects" | "categories" | "materials" | "tags",
  value: string,
  opts: { excludeId?: string; scopeColumn?: string; scopeValue?: string } = {},
): Promise<string> {
  const base = slugify(value) || "item";
  let candidate = base;
  for (let i = 2; i < 200; i++) {
    const params: unknown[] = [candidate];
    let sql = `SELECT 1 FROM ${table} WHERE slug = $1`;
    if (opts.excludeId) {
      params.push(opts.excludeId);
      sql += ` AND id <> $${params.length}`;
    }
    if (opts.scopeColumn && opts.scopeValue) {
      params.push(opts.scopeValue);
      sql += ` AND ${opts.scopeColumn} = $${params.length}`;
    }
    const rows = await query(`${sql} LIMIT 1`, params);
    if (rows.length === 0) return candidate;
    candidate = `${base}-${i}`;
  }
  return `${base}-${Date.now().toString(36)}`;
}
