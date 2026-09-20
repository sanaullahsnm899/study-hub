import { fail, handler, ok, readJson } from "@/lib/api";
import { requireApiAdmin } from "@/lib/auth";
import { deleteCategory, updateCategory } from "@/lib/repo/taxonomy";
import { categorySchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export const PATCH = handler(async (req: Request, ctx: Ctx) => {
  await requireApiAdmin(req);
  const { id } = await ctx.params;
  const data = categorySchema.partial().parse(await readJson(req));
  const item = await updateCategory(id, data);
  if (!item) return fail(404, "That category no longer exists.");
  return ok({ item });
});

export const DELETE = handler(async (req: Request, ctx: Ctx) => {
  await requireApiAdmin(req);
  const { id } = await ctx.params;
  const result = await deleteCategory(id);
  if (!result.ok) return fail(409, result.reason);
  return ok({ ok: true });
});
