import { query, queryOne } from "../db";

export type DashboardStats = {
  materials: number;
  published: number;
  drafts: number;
  archived: number;
  subjects: number;
  semesters: number;
  categories: number;
  downloads: number;
  downloads_30d: number;
  uploads_7d: number;
};

export async function dashboardStats(): Promise<DashboardStats> {
  const row = await queryOne<Record<string, string>>(`
    SELECT
      (SELECT count(*) FROM materials WHERE deleted_at IS NULL)::text AS materials,
      (SELECT count(*) FROM materials WHERE deleted_at IS NULL AND status = 'published')::text AS published,
      (SELECT count(*) FROM materials WHERE deleted_at IS NULL AND status = 'draft')::text AS drafts,
      (SELECT count(*) FROM materials WHERE deleted_at IS NULL AND status = 'archived')::text AS archived,
      (SELECT count(*) FROM subjects)::text AS subjects,
      (SELECT count(*) FROM semesters)::text AS semesters,
      (SELECT count(*) FROM categories)::text AS categories,
      (SELECT COALESCE(sum(download_count), 0) FROM materials WHERE deleted_at IS NULL)::text AS downloads,
      (SELECT count(*) FROM download_events WHERE kind <> 'view' AND created_at > now() - interval '30 days')::text AS downloads_30d,
      (SELECT count(*) FROM materials WHERE deleted_at IS NULL AND created_at > now() - interval '7 days')::text AS uploads_7d
  `);
  const n = (k: string) => Number(row?.[k] || 0);
  return {
    materials: n("materials"),
    published: n("published"),
    drafts: n("drafts"),
    archived: n("archived"),
    subjects: n("subjects"),
    semesters: n("semesters"),
    categories: n("categories"),
    downloads: n("downloads"),
    downloads_30d: n("downloads_30d"),
    uploads_7d: n("uploads_7d"),
  };
}

export function materialsBySemester() {
  return query<{ name: string; slug: string; total: number; published: number; downloads: number }>(`
    SELECT sem.name, sem.slug,
           count(m.id)::int AS total,
           count(m.id) FILTER (WHERE m.status = 'published')::int AS published,
           COALESCE(sum(m.download_count), 0)::int AS downloads
      FROM semesters sem
      LEFT JOIN materials m ON m.semester_id = sem.id AND m.deleted_at IS NULL
     GROUP BY sem.id
     ORDER BY sem.sort_order, sem.name
  `);
}

export function materialsByCategory() {
  return query<{ name: string; total: number }>(`
    SELECT c.name, count(m.id)::int AS total
      FROM categories c
      LEFT JOIN materials m ON m.category_id = c.id AND m.deleted_at IS NULL
     GROUP BY c.id
     ORDER BY total DESC, c.name
  `);
}

export function topDownloads(limit = 8) {
  return query<{
    id: string;
    title: string;
    slug: string;
    download_count: number;
    subject_name: string;
  }>(
    `SELECT m.id, m.title, m.slug, m.download_count, sub.name AS subject_name
       FROM materials m JOIN subjects sub ON sub.id = m.subject_id
      WHERE m.deleted_at IS NULL
      ORDER BY m.download_count DESC, m.updated_at DESC
      LIMIT $1`,
    [limit],
  );
}

/** Download counts per day for the last N days, zero-filled. */
export function downloadsPerDay(days = 30) {
  return query<{ day: string; total: number }>(
    `SELECT to_char(d.day, 'YYYY-MM-DD') AS day, COALESCE(e.total, 0)::int AS total
       FROM generate_series(current_date - ($1::int - 1), current_date, interval '1 day') AS d(day)
       LEFT JOIN (
         SELECT date_trunc('day', created_at) AS day, count(*)::int AS total
           FROM download_events
          WHERE kind <> 'view' AND created_at > now() - ($1::int || ' days')::interval
          GROUP BY 1
       ) e ON e.day = d.day
      ORDER BY d.day`,
    [days],
  );
}
