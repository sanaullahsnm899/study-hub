import { fail, handler } from "@/lib/api";
import { getMaterialById, recordEvent } from "@/lib/repo/materials";
import { isSafeHttpUrl } from "@/lib/utils";

export const dynamic = "force-dynamic";

/** Counts a click on an external resource, then redirects to it. */
export const GET = handler(async (_req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const { id } = await ctx.params;
  const material = /^[0-9a-f-]{36}$/i.test(id) ? await getMaterialById(id) : null;
  if (!material || material.status !== "published" || !material.external_url) {
    return fail(404, "This material is currently unavailable.");
  }
  if (!isSafeHttpUrl(material.external_url)) return fail(400, "This link is not valid.");
  await recordEvent(material.id, "external");
  return Response.redirect(material.external_url, 302);
});
