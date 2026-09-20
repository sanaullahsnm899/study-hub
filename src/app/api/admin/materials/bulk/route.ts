import { fail, handler, ok, readJson } from "@/lib/api";
import { requireApiAdmin } from "@/lib/auth";
import { bulkSetStatus, bulkSoftDelete } from "@/lib/repo/materials";

export const dynamic = "force-dynamic";

export const POST = handler(async (req: Request) => {
  await requireApiAdmin(req);
  const { ids, action } = await readJson<{ ids?: string[]; action?: string }>(req);
  if (!Array.isArray(ids) || ids.length === 0) return fail(400, "Select at least one material.");
  if (ids.length > 200) return fail(400, "Select fewer than 200 materials at a time.");

  switch (action) {
    case "publish":
      return ok({ affected: await bulkSetStatus(ids, "published") });
    case "unpublish":
      return ok({ affected: await bulkSetStatus(ids, "draft") });
    case "archive":
      return ok({ affected: await bulkSetStatus(ids, "archived") });
    case "delete":
      return ok({ affected: await bulkSoftDelete(ids) });
    default:
      return fail(400, "Unknown action.");
  }
});
