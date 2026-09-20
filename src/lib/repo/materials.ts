import { query, queryOne, withTransaction } from "../db";
import { slugify } from "../utils";
import type { MaterialStatus, MaterialWithRefs, Paginated } from "../types";
import { uniqueSlug } from "./slug";

const SELECT_WITH_REFS = `
  SELECT m.*,
         sem.name AS semester_name, sem.slug AS semester_slug,
         sub.name AS subject_name,  sub.slug AS subject_slug, sub.icon AS subject_icon,
         cat.name AS category_name, cat.slug AS category_slug, cat.icon AS category_icon,
         COALESCE(
           (SELECT array_agg(t.name ORDER BY t.name)
              FROM material_tags mt JOIN tags t ON t.id = mt.tag_id
             WHERE mt.material_id = m.id),
           '{}'
         ) AS tags
    FROM materials m
    JOIN semesters sem ON sem.id = m.semester_id
    JOIN subjects  sub ON sub.id = m.subject_id
    JOIN categories cat ON cat.id = m.category_id
`;

export type PublicFilters = {
  q?: string;
  semester?: string;
  subject?: string;
  category?: string;
  fileType?: string;
  since?: string; // ISO date
  page?: number;
  pageSize?: number;
  sort?: "recent" | "popular" | "title";
};

/** Published, non-deleted materials only. Used by every public surface. */
export async function listPublicMaterials(f: PublicFilters = {}): Promise<Paginated<MaterialWithRefs>> {
  const page = Math.max(1, f.page || 1);
  const pageSize = Math.min(60, Math.max(1, f.pageSize || 20));
  const where: string[] = [`m.deleted_at IS NULL`, `m.status = 'published'`, `sem.is_active`, `sub.is_active`];
  const params: unknown[] = [];

  if (f.semester) {
    params.push(f.semester);
    where.push(`sem.slug = $${params.length}`);
  }
  if (f.subject) {
    params.push(f.subject);
    where.push(`sub.slug = $${params.length}`);
  }
  if (f.category) {
    params.push(f.category);
    where.push(`cat.slug = $${params.length}`);
  }
  if (f.fileType) {
    params.push(f.fileType.toLowerCase());
    where.push(
      `(lower(coalesce(m.file_type,'')) LIKE '%' || $${params.length} || '%'
        OR lower(coalesce(m.file_name,'')) LIKE '%.' || $${params.length}
        OR ($${params.length} = 'link' AND m.external_url IS NOT NULL))`,
    );
  }
  if (f.since) {
    params.push(f.since);
    where.push(`m.published_at >= $${params.length}::timestamptz`);
  }

  let rank = "";
  if (f.q && f.q.trim()) {
    const q = f.q.trim();
    params.push(q);
    const i = params.length;
    where.push(`(
      m.search_vector @@ websearch_to_tsquery('english', $${i})
      OR m.title ILIKE '%' || $${i} || '%'
      OR sub.name ILIKE '%' || $${i} || '%'
      OR sem.name ILIKE '%' || $${i} || '%'
      OR cat.name ILIKE '%' || $${i} || '%'
      OR EXISTS (SELECT 1 FROM material_tags mt JOIN tags t ON t.id = mt.tag_id
                  WHERE mt.material_id = m.id AND t.name ILIKE '%' || $${i} || '%')
    )`);
    rank = `ts_rank(m.search_vector, websearch_to_tsquery('english', $${i})) DESC,
            (CASE WHEN m.title ILIKE '%' || $${i} || '%' THEN 1 ELSE 0 END) DESC,`;
  }

  const order =
    f.sort === "popular"
      ? `m.download_count DESC, m.published_at DESC NULLS LAST`
      : f.sort === "title"
        ? `m.title ASC`
        : `m.published_at DESC NULLS LAST, m.created_at DESC`;

  const whereSql = `WHERE ${where.join(" AND ")}`;
  const totalRow = await queryOne<{ count: string }>(
    `SELECT count(*)::text AS count
       FROM materials m
       JOIN semesters sem ON sem.id = m.semester_id
       JOIN subjects sub ON sub.id = m.subject_id
       JOIN categories cat ON cat.id = m.category_id
     ${whereSql}`,
    params,
  );
  const total = Number(totalRow?.count || 0);

  params.push(pageSize, (page - 1) * pageSize);
  const items = await query<MaterialWithRefs>(
    `${SELECT_WITH_REFS} ${whereSql}
      ORDER BY ${rank} ${order}
      LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params,
  );

  return { items, total, page, pageSize, pageCount: Math.max(1, Math.ceil(total / pageSize)) };
}

export function getPublicMaterialBySlug(slug: string) {
  return queryOne<MaterialWithRefs>(
    `${SELECT_WITH_REFS} WHERE m.slug = $1 AND m.deleted_at IS NULL AND m.status = 'published'`,
    [slug],
  );
}

export function getMaterialById(id: string, opts: { includeDeleted?: boolean } = {}) {
  return queryOne<MaterialWithRefs>(
    `${SELECT_WITH_REFS} WHERE m.id = $1 ${opts.includeDeleted ? "" : "AND m.deleted_at IS NULL"}`,
    [id],
  );
}

export function recentMaterials(limit = 6) {
  return listPublicMaterials({ pageSize: limit, sort: "recent" }).then((r) => r.items);
}

export function popularMaterials(limit = 5) {
  return query<MaterialWithRefs>(
    `${SELECT_WITH_REFS}
      WHERE m.deleted_at IS NULL AND m.status = 'published' AND m.download_count > 0
      ORDER BY m.download_count DESC, m.published_at DESC NULLS LAST
      LIMIT $1`,
    [limit],
  );
}

/* --------------------------------------------------------------- admin lists */

export type AdminFilters = PublicFilters & { status?: MaterialStatus | "all" };

export async function listAdminMaterials(f: AdminFilters = {}): Promise<Paginated<MaterialWithRefs>> {
  const page = Math.max(1, f.page || 1);
  const pageSize = Math.min(100, Math.max(1, f.pageSize || 20));
  const where: string[] = [`m.deleted_at IS NULL`];
  const params: unknown[] = [];

  if (f.status && f.status !== "all") {
    params.push(f.status);
    where.push(`m.status = $${params.length}`);
  }
  if (f.semester) {
    params.push(f.semester);
    where.push(`sem.slug = $${params.length}`);
  }
  if (f.subject) {
    params.push(f.subject);
    where.push(`sub.slug = $${params.length}`);
  }
  if (f.category) {
    params.push(f.category);
    where.push(`cat.slug = $${params.length}`);
  }
  if (f.fileType) {
    params.push(f.fileType.toLowerCase());
    where.push(
      `(lower(coalesce(m.file_type,'')) LIKE '%' || $${params.length} || '%'
        OR lower(coalesce(m.file_name,'')) LIKE '%.' || $${params.length}
        OR ($${params.length} = 'link' AND m.external_url IS NOT NULL))`,
    );
  }
  if (f.q && f.q.trim()) {
    params.push(f.q.trim());
    const i = params.length;
    where.push(
      `(m.title ILIKE '%' || $${i} || '%' OR coalesce(m.description,'') ILIKE '%' || $${i} || '%'
        OR sub.name ILIKE '%' || $${i} || '%' OR coalesce(m.instructor,'') ILIKE '%' || $${i} || '%')`,
    );
  }

  const order =
    f.sort === "popular"
      ? `m.download_count DESC`
      : f.sort === "title"
        ? `m.title ASC`
        : `m.updated_at DESC`;

  const whereSql = `WHERE ${where.join(" AND ")}`;
  const totalRow = await queryOne<{ count: string }>(
    `SELECT count(*)::text AS count FROM materials m
       JOIN semesters sem ON sem.id = m.semester_id
       JOIN subjects sub ON sub.id = m.subject_id
       JOIN categories cat ON cat.id = m.category_id
     ${whereSql}`,
    params,
  );
  const total = Number(totalRow?.count || 0);

  params.push(pageSize, (page - 1) * pageSize);
  const items = await query<MaterialWithRefs>(
    `${SELECT_WITH_REFS} ${whereSql} ORDER BY ${order} LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params,
  );
  return { items, total, page, pageSize, pageCount: Math.max(1, Math.ceil(total / pageSize)) };
}

/* -------------------------------------------------------------------- writes */

export type MaterialWrite = {
  title: string;
  description?: string;
  semester_id: string;
  subject_id: string;
  category_id: string;
  instructor?: string;
  tags?: string[];
  status?: MaterialStatus;
  external_url?: string;
  storage_provider?: string;
  storage_file_id?: string;
  storage_url?: string;
  file_name?: string;
  file_type?: string;
  file_size?: number;
};

async function syncTags(
  client: import("pg").PoolClient,
  materialId: string,
  tags: string[] | undefined,
) {
  if (!tags) return;
  await client.query(`DELETE FROM material_tags WHERE material_id = $1`, [materialId]);
  for (const raw of tags.map((t) => t.trim()).filter(Boolean).slice(0, 12)) {
    const slug = slugify(raw);
    if (!slug) continue;
    const { rows } = await client.query<{ id: string }>(
      `INSERT INTO tags (name, slug) VALUES ($1, $2)
       ON CONFLICT (slug) DO UPDATE SET name = tags.name RETURNING id`,
      [raw, slug],
    );
    await client.query(
      `INSERT INTO material_tags (material_id, tag_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
      [materialId, rows[0].id],
    );
  }
}

export async function createMaterial(input: MaterialWrite, createdBy?: string) {
  const slug = await uniqueSlug("materials", input.title);
  const status = input.status ?? "draft";
  const id = await withTransaction(async (client) => {
    const { rows } = await client.query<{ id: string }>(
      `INSERT INTO materials
        (title, slug, description, semester_id, subject_id, category_id, instructor, status,
         external_url, storage_provider, storage_file_id, storage_url, file_name, file_type, file_size,
         published_at, created_by)
       VALUES ($1,$2,NULLIF($3,''),$4,$5,$6,NULLIF($7,''),$8,NULLIF($9,''),NULLIF($10,''),NULLIF($11,''),
               NULLIF($12,''),NULLIF($13,''),NULLIF($14,''),$15,
               CASE WHEN $8 = 'published' THEN now() ELSE NULL END, $16)
       RETURNING id`,
      [
        input.title,
        slug,
        input.description ?? "",
        input.semester_id,
        input.subject_id,
        input.category_id,
        input.instructor ?? "",
        status,
        input.external_url ?? "",
        input.storage_provider ?? "",
        input.storage_file_id ?? "",
        input.storage_url ?? "",
        input.file_name ?? "",
        input.file_type ?? "",
        input.file_size ?? null,
        createdBy ?? null,
      ],
    );
    await syncTags(client, rows[0].id, input.tags);
    return rows[0].id;
  });
  return getMaterialById(id);
}

export async function updateMaterial(id: string, input: Partial<MaterialWrite>) {
  const current = await getMaterialById(id);
  if (!current) return null;
  const slug = input.title && input.title !== current.title
    ? await uniqueSlug("materials", input.title, { excludeId: id })
    : null;

  await withTransaction(async (client) => {
    await client.query(
      `UPDATE materials SET
         title = COALESCE($2, title),
         slug = COALESCE($3, slug),
         description = COALESCE($4, description),
         semester_id = COALESCE($5, semester_id),
         subject_id = COALESCE($6, subject_id),
         category_id = COALESCE($7, category_id),
         instructor = COALESCE($8, instructor),
         status = COALESCE($9, status),
         external_url = COALESCE($10, external_url),
         storage_provider = COALESCE(NULLIF($11,''), storage_provider),
         storage_file_id = COALESCE(NULLIF($12,''), storage_file_id),
         storage_url = COALESCE(NULLIF($13,''), storage_url),
         file_name = COALESCE(NULLIF($14,''), file_name),
         file_type = COALESCE(NULLIF($15,''), file_type),
         file_size = COALESCE($16, file_size),
         published_at = CASE
           WHEN COALESCE($9, status) = 'published' AND published_at IS NULL THEN now()
           WHEN COALESCE($9, status) <> 'published' THEN NULL
           ELSE published_at END
       WHERE id = $1`,
      [
        id,
        input.title ?? null,
        slug,
        input.description ?? null,
        input.semester_id ?? null,
        input.subject_id ?? null,
        input.category_id ?? null,
        input.instructor ?? null,
        input.status ?? null,
        input.external_url ?? null,
        input.storage_provider ?? "",
        input.storage_file_id ?? "",
        input.storage_url ?? "",
        input.file_name ?? "",
        input.file_type ?? "",
        input.file_size ?? null,
      ],
    );
    await syncTags(client, id, input.tags);
  });
  return getMaterialById(id);
}

export async function setMaterialStatus(id: string, status: MaterialStatus) {
  return queryOne<{ id: string; status: MaterialStatus }>(
    `UPDATE materials SET status = $2,
       published_at = CASE WHEN $2 = 'published' THEN COALESCE(published_at, now()) ELSE NULL END
     WHERE id = $1 AND deleted_at IS NULL RETURNING id, status`,
    [id, status],
  );
}

/** Soft delete — the row (and its Drive file) can be restored. */
export async function softDeleteMaterial(id: string) {
  return queryOne<{ id: string }>(
    `UPDATE materials SET deleted_at = now(), status = 'archived' WHERE id = $1 AND deleted_at IS NULL RETURNING id`,
    [id],
  );
}

export async function restoreMaterial(id: string) {
  return queryOne<{ id: string }>(
    `UPDATE materials SET deleted_at = NULL, status = 'draft' WHERE id = $1 RETURNING id`,
    [id],
  );
}

export async function purgeMaterial(id: string) {
  await query(`DELETE FROM materials WHERE id = $1`, [id]);
}

export async function bulkSetStatus(ids: string[], status: MaterialStatus) {
  const rows = await query<{ id: string }>(
    `UPDATE materials SET status = $2,
       published_at = CASE WHEN $2 = 'published' THEN COALESCE(published_at, now()) ELSE NULL END
     WHERE id = ANY($1::uuid[]) AND deleted_at IS NULL RETURNING id`,
    [ids, status],
  );
  return rows.length;
}

export async function bulkSoftDelete(ids: string[]) {
  const rows = await query<{ id: string }>(
    `UPDATE materials SET deleted_at = now(), status = 'archived'
      WHERE id = ANY($1::uuid[]) AND deleted_at IS NULL RETURNING id`,
    [ids],
  );
  return rows.length;
}

export async function recordEvent(materialId: string, kind: "download" | "view" | "external") {
  await withTransaction(async (client) => {
    await client.query(`INSERT INTO download_events (material_id, kind) VALUES ($1, $2)`, [
      materialId,
      kind,
    ]);
    if (kind !== "view") {
      await client.query(`UPDATE materials SET download_count = download_count + 1 WHERE id = $1`, [
        materialId,
      ]);
    }
  });
}
