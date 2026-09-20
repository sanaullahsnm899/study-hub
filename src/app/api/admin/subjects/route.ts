import { handler, ok, readJson } from "@/lib/api";
import { requireApiAdmin } from "@/lib/auth";
import { createSubject, listSubjects } from "@/lib/repo/taxonomy";
import { subjectSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

export const GET = handler(async (req: Request) => {
  await requireApiAdmin(req);
  const semesterId = new URL(req.url).searchParams.get("semester_id") || undefined;
  return ok({ items: await listSubjects({ semesterId, includeInactive: true }) });
});

export const POST = handler(async (req: Request) => {
  await requireApiAdmin(req);
  const data = subjectSchema.parse(await readJson(req));
  return ok({ item: await createSubject(data) }, { status: 201 });
});
