import { handler } from "@/lib/api";
import { serveMaterialFile } from "@/lib/serve-file";

export const dynamic = "force-dynamic";

export const GET = handler(async (_req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const { id } = await ctx.params;
  return serveMaterialFile(id, "download");
});
