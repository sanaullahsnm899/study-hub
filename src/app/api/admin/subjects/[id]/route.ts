import { fail, handler, ok, readJson } from "@/lib/api";
import { requireApiAdmin } from "@/lib/auth";
import { deleteSubject, updateSubject } from "@/lib/repo/taxonomy";
import { subjectSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export const PATCH = handler(async (req: Request, ctx: Ctx) => {
  await requireApiAdmin(req);
  const { id } = await ctx.params;
  const data = subjectSchema.partial().parse(await readJson(req));
  const item = await updateSubject(id, data);
  if (!item) return fail(404, "That subject no longer exists.");
  return ok({ item });
});

export const DELETE = handler(async (req: Request, ctx: Ctx) => {
  await requireApiAdmin(req);
  const { id } = await ctx.params;
  const result = await deleteSubject(id);
  if (!result.ok) return fail(409, result.reason);
  return ok({ ok: true });
});
