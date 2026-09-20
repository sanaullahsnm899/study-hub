import { fail, handler, ok, readJson } from "@/lib/api";
import { requireApiAdmin } from "@/lib/auth";
import { reorder } from "@/lib/repo/taxonomy";
import { reorderSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

const TABLES = ["semesters", "subjects", "categories"] as const;

export const POST = handler(async (req: Request) => {
  await requireApiAdmin(req);
  const body = await readJson<{ table?: string; ids?: string[] }>(req);
  const table = TABLES.find((t) => t === body.table);
  if (!table) return fail(400, "Unknown list.");
  const { ids } = reorderSchema.parse({ ids: body.ids });
  await reorder(table, ids);
  return ok({ ok: true });
});
