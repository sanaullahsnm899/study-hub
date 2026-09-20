import { handler, ok, readJson } from "@/lib/api";
import { requireApiAdmin } from "@/lib/auth";
import { createCategory, listCategories } from "@/lib/repo/taxonomy";
import { categorySchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

export const GET = handler(async (req: Request) => {
  await requireApiAdmin(req);
  return ok({ items: await listCategories({ includeInactive: true }) });
});

export const POST = handler(async (req: Request) => {
  await requireApiAdmin(req);
  const data = categorySchema.parse(await readJson(req));
  return ok({ item: await createCategory(data) }, { status: 201 });
});
