import { cookies } from "next/headers";
import { fail, handler, ok, readJson } from "@/lib/api";
import { findAdminByEmail, touchLogin } from "@/lib/repo/admins";
import { verifyPassword } from "@/lib/password";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import {
  CSRF_COOKIE,
  SESSION_COOKIE,
  createSessionToken,
  csrfCookieOptions,
  newCsrfToken,
  sessionCookieOptions,
} from "@/lib/session";
import { fieldErrors, loginSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

export const POST = handler(async (req: Request) => {
  const ip = clientIp(req.headers);
  const limit = rateLimit(`login:${ip}`, 8, 15 * 60_000);
  if (!limit.ok) {
    return fail(429, `Too many attempts. Try again in ${Math.ceil(limit.retryAfter / 60)} minutes.`);
  }

  const parsed = loginSchema.safeParse(await readJson(req));
  if (!parsed.success) return fail(422, "Check your email and password.", fieldErrors(parsed.error));

  const admin = await findAdminByEmail(parsed.data.email);
  // Same message and comparable work either way — no account enumeration.
  const valid = admin ? await verifyPassword(parsed.data.password, admin.password_hash) : false;
  if (!admin || !valid) {
    rateLimit(`login-fail:${ip}`, 5, 15 * 60_000);
    return fail(401, "That email and password don't match.");
  }

  await touchLogin(admin.id);
  const store = await cookies();
  store.set(
    SESSION_COOKIE,
    createSessionToken({ sub: admin.id, email: admin.email, name: admin.name, role: "admin" }),
    sessionCookieOptions(),
  );
  store.set(CSRF_COOKIE, newCsrfToken(), csrfCookieOptions());

  return ok({ ok: true, name: admin.name });
});
