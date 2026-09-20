import { query, queryOne } from "../db";
import type {
  Category,
  CategoryWithCount,
  Semester,
  SemesterWithCounts,
  Subject,
  SubjectWithCounts,
} from "../types";
import { uniqueSlug } from "./slug";

/* ------------------------------------------------------------------ semesters */

export function listSemesters(opts: { includeInactive?: boolean } = {}) {
  return query<SemesterWithCounts>(
    `SELECT s.*,
            (SELECT count(*) FROM subjects sub
              WHERE sub.semester_id = s.id AND ($1::boolean OR sub.is_active))::int AS subject_count,
            (SELECT count(*) FROM materials m
              WHERE m.semester_id = s.id AND m.deleted_at IS NULL
                AND ($1::boolean OR m.status = 'published'))::int AS material_count
       FROM semesters s
      WHERE ($1::boolean OR s.is_active)
      ORDER BY s.sort_order, s.name`,
    [Boolean(opts.includeInactive)],
  );
}

export function getSemesterBySlug(slug: string, includeInactive = false) {
  return queryOne<SemesterWithCounts>(
    `SELECT s.*,
            (SELECT count(*) FROM subjects sub WHERE sub.semester_id = s.id AND ($2::boolean OR sub.is_active))::int AS subject_count,
            (SELECT count(*) FROM materials m WHERE m.semester_id = s.id AND m.deleted_at IS NULL AND ($2::boolean OR m.status = 'published'))::int AS material_count
       FROM semesters s
      WHERE s.slug = $1 AND ($2::boolean OR s.is_active)`,
    [slug, includeInactive],
  );
}

export async function createSemester(input: {
  name: string;
  short_label?: string;
  description?: string;
  sort_order?: number;
  is_active?: boolean;
}) {
  const slug = await uniqueSlug("semesters", input.name);
  return queryOne<Semester>(
    `INSERT INTO semesters (name, slug, short_label, description, sort_order, is_active)
     VALUES ($1, $2, NULLIF($3,''), NULLIF($4,''), $5, $6) RETURNING *`,
    [
      input.name,
      slug,
      input.short_label ?? "",
      input.description ?? "",
      input.sort_order ?? 0,
      input.is_active ?? true,
    ],
  );
}

export async function updateSemester(
  id: string,
  input: Partial<{
    name: string;
    short_label: string;
    description: string;
    sort_order: number;
    is_active: boolean;
  }>,
) {
  const slug = input.name ? await uniqueSlug("semesters", input.name, { excludeId: id }) : null;
  return queryOne<Semester>(
    `UPDATE semesters SET
       name = COALESCE($2, name),
       slug = COALESCE($3, slug),
       short_label = COALESCE(NULLIF($4,''), short_label),
       description = COALESCE($5, description),
       sort_order = COALESCE($6, sort_order),
       is_active = COALESCE($7, is_active)
     WHERE id = $1 RETURNING *`,
    [
      id,
      input.name ?? null,
      slug,
      input.short_label ?? "",
      input.description ?? null,
      input.sort_order ?? null,
      input.is_active ?? null,
    ],
  );
}

export async function deleteSemester(id: string) {
  const blocking = await queryOne<{ count: string }>(
    `SELECT count(*)::text AS count FROM materials WHERE semester_id = $1 AND deleted_at IS NULL`,
    [id],
  );
  if (Number(blocking?.count || 0) > 0) {
    return { ok: false as const, reason: "This semester still has materials. Move or delete them first." };
  }
  await query(`DELETE FROM semesters WHERE id = $1`, [id]);
  return { ok: true as const };
}

/* ------------------------------------------------------------------- subjects */

export function listSubjects(opts: { semesterId?: string; includeInactive?: boolean } = {}) {
  return query<SubjectWithCounts>(
    `SELECT sub.*, sem.name AS semester_name, sem.slug AS semester_slug,
            (SELECT count(*) FROM materials m
              WHERE m.subject_id = sub.id AND m.deleted_at IS NULL
                AND ($2::boolean OR m.status = 'published'))::int AS material_count
       FROM subjects sub
       JOIN semesters sem ON sem.id = sub.semester_id
      WHERE ($1::uuid IS NULL OR sub.semester_id = $1)
        AND ($2::boolean OR sub.is_active)
      ORDER BY sem.sort_order, sub.sort_order, sub.name`,
    [opts.semesterId ?? null, Boolean(opts.includeInactive)],
  );
}

export function getSubjectBySlug(semesterSlug: string, subjectSlug: string, includeInactive = false) {
  return queryOne<SubjectWithCounts>(
    `SELECT sub.*, sem.name AS semester_name, sem.slug AS semester_slug,
            (SELECT count(*) FROM materials m
              WHERE m.subject_id = sub.id AND m.deleted_at IS NULL AND ($3::boolean OR m.status = 'published'))::int AS material_count
       FROM subjects sub
       JOIN semesters sem ON sem.id = sub.semester_id
      WHERE sem.slug = $1 AND sub.slug = $2 AND ($3::boolean OR (sub.is_active AND sem.is_active))`,
    [semesterSlug, subjectSlug, includeInactive],
  );
}

export async function createSubject(input: {
  semester_id: string;
  name: string;
  code?: string;
  description?: string;
  icon?: string;
  sort_order?: number;
  is_active?: boolean;
}) {
  const slug = await uniqueSlug("subjects", input.name, {
    scopeColumn: "semester_id",
    scopeValue: input.semester_id,
  });
  return queryOne<Subject>(
    `INSERT INTO subjects (semester_id, name, slug, code, description, icon, sort_order, is_active)
     VALUES ($1,$2,$3,NULLIF($4,''),NULLIF($5,''),$6,$7,$8) RETURNING *`,
    [
      input.semester_id,
      input.name,
      slug,
      input.code ?? "",
      input.description ?? "",
      input.icon || "book",
      input.sort_order ?? 0,
      input.is_active ?? true,
    ],
  );
}

export async function updateSubject(
  id: string,
  input: Partial<{
    semester_id: string;
    name: string;
    code: string;
    description: string;
    icon: string;
    sort_order: number;
    is_active: boolean;
  }>,
) {
  const current = await queryOne<Subject>(`SELECT * FROM subjects WHERE id = $1`, [id]);
  if (!current) return null;
  const semesterId = input.semester_id ?? current.semester_id;
  const slug =
    input.name || input.semester_id
      ? await uniqueSlug("subjects", input.name ?? current.name, {
          excludeId: id,
          scopeColumn: "semester_id",
          scopeValue: semesterId,
        })
      : null;
  return queryOne<Subject>(
    `UPDATE subjects SET
       semester_id = COALESCE($2, semester_id),
       name = COALESCE($3, name),
       slug = COALESCE($4, slug),
       code = COALESCE(NULLIF($5,''), code),
       description = COALESCE($6, description),
       icon = COALESCE($7, icon),
       sort_order = COALESCE($8, sort_order),
       is_active = COALESCE($9, is_active)
     WHERE id = $1 RETURNING *`,
    [
      id,
      input.semester_id ?? null,
      input.name ?? null,
      slug,
      input.code ?? "",
      input.description ?? null,
      input.icon ?? null,
      input.sort_order ?? null,
      input.is_active ?? null,
    ],
  );
}

export async function deleteSubject(id: string) {
  const blocking = await queryOne<{ count: string }>(
    `SELECT count(*)::text AS count FROM materials WHERE subject_id = $1 AND deleted_at IS NULL`,
    [id],
  );
  if (Number(blocking?.count || 0) > 0) {
    return { ok: false as const, reason: "This subject still has materials. Move or delete them first." };
  }
  await query(`DELETE FROM subjects WHERE id = $1`, [id]);
  return { ok: true as const };
}

/* ----------------------------------------------------------------- categories */

export function listCategories(opts: { includeInactive?: boolean } = {}) {
  return query<CategoryWithCount>(
    `SELECT c.*,
            (SELECT count(*) FROM materials m
              WHERE m.category_id = c.id AND m.deleted_at IS NULL
                AND ($1::boolean OR m.status = 'published'))::int AS material_count
       FROM categories c
      WHERE ($1::boolean OR c.is_active)
      ORDER BY c.sort_order, c.name`,
    [Boolean(opts.includeInactive)],
  );
}

/** Categories that actually contain published material for a subject. */
export function listCategoriesForSubject(subjectId: string) {
  return query<CategoryWithCount>(
    `SELECT c.*, count(m.id)::int AS material_count
       FROM categories c
       JOIN materials m ON m.category_id = c.id
        AND m.subject_id = $1 AND m.deleted_at IS NULL AND m.status = 'published'
      WHERE c.is_active
      GROUP BY c.id
      ORDER BY c.sort_order, c.name`,
    [subjectId],
  );
}

export function getCategoryBySlug(slug: string) {
  return queryOne<Category>(`SELECT * FROM categories WHERE slug = $1`, [slug]);
}

export async function createCategory(input: {
  name: string;
  description?: string;
  icon?: string;
  sort_order?: number;
  is_active?: boolean;
}) {
  const slug = await uniqueSlug("categories", input.name);
  return queryOne<Category>(
    `INSERT INTO categories (name, slug, description, icon, sort_order, is_active)
     VALUES ($1,$2,NULLIF($3,''),$4,$5,$6) RETURNING *`,
    [input.name, slug, input.description ?? "", input.icon || "file", input.sort_order ?? 0, input.is_active ?? true],
  );
}

export async function updateCategory(
  id: string,
  input: Partial<{ name: string; description: string; icon: string; sort_order: number; is_active: boolean }>,
) {
  const slug = input.name ? await uniqueSlug("categories", input.name, { excludeId: id }) : null;
  return queryOne<Category>(
    `UPDATE categories SET
       name = COALESCE($2, name),
       slug = COALESCE($3, slug),
       description = COALESCE($4, description),
       icon = COALESCE($5, icon),
       sort_order = COALESCE($6, sort_order),
       is_active = COALESCE($7, is_active)
     WHERE id = $1 RETURNING *`,
    [id, input.name ?? null, slug, input.description ?? null, input.icon ?? null, input.sort_order ?? null, input.is_active ?? null],
  );
}

export async function deleteCategory(id: string) {
  const blocking = await queryOne<{ count: string }>(
    `SELECT count(*)::text AS count FROM materials WHERE category_id = $1 AND deleted_at IS NULL`,
    [id],
  );
  if (Number(blocking?.count || 0) > 0) {
    return { ok: false as const, reason: "This category still has materials. Move or delete them first." };
  }
  await query(`DELETE FROM categories WHERE id = $1`, [id]);
  return { ok: true as const };
}

/* -------------------------------------------------------------------- reorder */

export async function reorder(
  table: "semesters" | "subjects" | "categories",
  ids: string[],
) {
  await query(
    `UPDATE ${table} AS t SET sort_order = v.ord
       FROM (SELECT unnest($1::uuid[]) AS id, generate_subscripts($1::uuid[], 1) AS ord) AS v
      WHERE t.id = v.id`,
    [ids],
  );
}
