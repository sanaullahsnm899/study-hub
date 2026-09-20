import { query, queryOne } from "../db";
import { hashPassword } from "../password";

export type AdminRow = {
  id: string;
  email: string;
  name: string;
  password_hash: string;
  role: string;
  is_active: boolean;
  last_login_at: string | null;
};

export function findAdminByEmail(email: string) {
  return queryOne<AdminRow>(
    `SELECT * FROM admins WHERE lower(email) = lower($1) AND is_active = true`,
    [email],
  );
}

export function findAdminById(id: string) {
  return queryOne<AdminRow>(`SELECT * FROM admins WHERE id = $1 AND is_active = true`, [id]);
}

export async function touchLogin(id: string) {
  await query(`UPDATE admins SET last_login_at = now() WHERE id = $1`, [id]);
}

export async function upsertAdmin(email: string, name: string, password: string, role = "owner") {
  const hash = await hashPassword(password);
  return queryOne<AdminRow>(
    `INSERT INTO admins (email, name, password_hash, role)
     VALUES (lower($1), $2, $3, $4)
     ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash, name = EXCLUDED.name
     RETURNING *`,
    [email, name, hash, role],
  );
}

export async function changePassword(id: string, password: string) {
  const hash = await hashPassword(password);
  await query(`UPDATE admins SET password_hash = $2 WHERE id = $1`, [id, hash]);
}

export function countAdmins() {
  return queryOne<{ count: string }>(`SELECT count(*)::text AS count FROM admins`);
}
