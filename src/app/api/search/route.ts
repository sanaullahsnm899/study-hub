import { handler, ok } from "@/lib/api";
import { listPublicMaterials } from "@/lib/repo/materials";

export const dynamic = "force-dynamic";

/** Public search used by the ⌘K dialog. Published materials only. */
export const GET = handler(async (req: Request) => {
  const url = new URL(req.url);
  const q = (url.searchParams.get("q") || "").slice(0, 120);
  const limit = Math.min(20, Math.max(1, Number(url.searchParams.get("limit")) || 8));
  if (q.trim().length < 2) return ok({ items: [] });

  const result = await listPublicMaterials({
    q,
    semester: url.searchParams.get("semester") || undefined,
    category: url.searchParams.get("category") || undefined,
    fileType: url.searchParams.get("type") || undefined,
    pageSize: limit,
  });

  return ok({
    total: result.total,
    items: result.items.map((m) => ({
      id: m.id,
      title: m.title,
      slug: m.slug,
      subject_name: m.subject_name,
      semester_name: m.semester_name,
      category_name: m.category_name,
      file_type: m.file_type,
      file_name: m.file_name,
    })),
  });
});
