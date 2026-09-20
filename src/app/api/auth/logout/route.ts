import { cookies } from "next/headers";
import { handler, ok } from "@/lib/api";
import { CSRF_COOKIE, SESSION_COOKIE } from "@/lib/session";

export const dynamic = "force-dynamic";

export const POST = handler(async () => {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
  store.delete(CSRF_COOKIE);
  return ok({ ok: true });
});
