import { fail, handler, ok, readJson } from "@/lib/api";
import { requireApiAdmin } from "@/lib/auth";
import {
  getMaterialById,
  purgeMaterial,
  restoreMaterial,
  softDeleteMaterial,
  updateMaterial,
} from "@/lib/repo/materials";
import { getProviderByName } from "@/lib/storage";
import { materialUpdateSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export const GET = handler(async (req: Request, ctx: Ctx) => {
  await requireApiAdmin(req);
  const { id } = await ctx.params;
  const item = await getMaterialById(id);
  if (!item) return fail(404, "That material no longer exists.");
  return ok({ item });
});

export const PATCH = handler(async (req: Request, ctx: Ctx) => {
  await requireApiAdmin(req);
  const { id } = await ctx.params;
  const body = await readJson<Record<string, unknown>>(req);

  if (body.action === "restore") {
    const restored = await restoreMaterial(id);
    if (!restored) return fail(404, "That material no longer exists.");
    return ok({ item: await getMaterialById(id) });
  }

  const data = materialUpdateSchema.parse(body);
  const item = await updateMaterial(id, data);
  if (!item) return fail(404, "That material no longer exists.");
  return ok({ item });
});

/** Soft delete by default; ?purge=1 also removes the stored file. */
export const DELETE = handler(async (req: Request, ctx: Ctx) => {
  await requireApiAdmin(req);
  const { id } = await ctx.params;
  const purge = new URL(req.url).searchParams.get("purge") === "1";

  const material = await getMaterialById(id, { includeDeleted: true });
  if (!material) return fail(404, "That material no longer exists.");

  if (purge) {
    if (material.storage_file_id) {
      const provider = getProviderByName(material.storage_provider);
      if (provider) await provider.delete(material.storage_file_id).catch(() => undefined);
    }
    await purgeMaterial(id);
    return ok({ ok: true, purged: true });
  }

  await softDeleteMaterial(id);
  return ok({ ok: true, purged: false });
});
