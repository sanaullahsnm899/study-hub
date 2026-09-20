import { handler, ok, readJson } from "@/lib/api";
import { requireApiAdmin } from "@/lib/auth";
import { createSemester, listSemesters } from "@/lib/repo/taxonomy";
import { semesterSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

export const GET = handler(async (req: Request) => {
  await requireApiAdmin(req);
  return ok({ items: await listSemesters({ includeInactive: true }) });
});

export const POST = handler(async (req: Request) => {
  await requireApiAdmin(req);
  const data = semesterSchema.parse(await readJson(req));
  return ok({ item: await createSemester(data) }, { status: 201 });
});
