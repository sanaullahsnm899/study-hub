import { handler, ok } from "@/lib/api";
import { requireApiAdmin } from "@/lib/auth";
import { storageStatus } from "@/lib/storage";
import { MAX_UPLOAD_BYTES } from "@/lib/config";

export const dynamic = "force-dynamic";

export const GET = handler(async (req: Request) => {
  const session = await requireApiAdmin(req);
  return ok({
    admin: { email: session.email, name: session.name },
    storage: storageStatus(),
    maxUploadBytes: MAX_UPLOAD_BYTES,
  });
});
