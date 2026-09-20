import { handler, ok, readJson } from "@/lib/api";
import { requireApiAdmin } from "@/lib/auth";
import { createMaterial, listAdminMaterials } from "@/lib/repo/materials";
import type { MaterialStatus } from "@/lib/types";
import { materialSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

export const GET = handler(async (req: Request) => {
  await requireApiAdmin(req);
  const sp = new URL(req.url).searchParams;
  const result = await listAdminMaterials({
    q: sp.get("q") || undefined,
    status: (sp.get("status") as MaterialStatus | "all") || "all",
    semester: sp.get("semester") || undefined,
    subject: sp.get("subject") || undefined,
    category: sp.get("category") || undefined,
    fileType: sp.get("type") || undefined,
    sort: (sp.get("sort") as "recent" | "popular" | "title") || undefined,
    page: Number(sp.get("page")) || 1,
    pageSize: Number(sp.get("pageSize")) || 20,
  });
  return ok(result);
});

export const POST = handler(async (req: Request) => {
  const session = await requireApiAdmin(req);
  const data = materialSchema.parse(await readJson(req));
  const item = await createMaterial(data, session.sub);
  return ok({ item }, { status: 201 });
});
