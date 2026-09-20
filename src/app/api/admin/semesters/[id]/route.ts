import { fail, handler, ok, readJson } from "@/lib/api";
import { requireApiAdmin } from "@/lib/auth";
import { deleteSemester, updateSemester } from "@/lib/repo/taxonomy";
import { semesterSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export const PATCH = handler(async (req: Request, ctx: Ctx) => {
  await requireApiAdmin(req);
  const { id } = await ctx.params;
  const data = semesterSchema.partial().parse(await readJson(req));
  const item = await updateSemester(id, data);
  if (!item) return fail(404, "That semester no longer exists.");
  return ok({ item });
});

export const DELETE = handler(async (req: Request, ctx: Ctx) => {
  await requireApiAdmin(req);
  const { id } = await ctx.params;
  const result = await deleteSemester(id);
  if (!result.ok) return fail(409, result.reason);
  return ok({ ok: true });
});
