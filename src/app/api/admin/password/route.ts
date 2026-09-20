import { z } from "zod";
import { fail, handler, ok, readJson } from "@/lib/api";
import { requireApiAdmin } from "@/lib/auth";
import { changePassword, findAdminById } from "@/lib/repo/admins";
import { verifyPassword } from "@/lib/password";
import { clientIp, rateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

const schema = z.object({
  current: z.string().min(1, "Enter your current password."),
  next: z
    .string()
    .min(10, "Use at least 10 characters.")
    .max(200)
    .refine((v) => /[a-z]/i.test(v) && /\d/.test(v), {
      message: "Mix letters and numbers.",
    }),
});

export const POST = handler(async (req: Request) => {
  const session = await requireApiAdmin(req);

  const limit = rateLimit(`password:${clientIp(req.headers)}`, 5, 15 * 60_000);
  if (!limit.ok) return fail(429, "Too many attempts. Try again in a few minutes.");

  const { current, next } = schema.parse(await readJson(req));

  const admin = await findAdminById(session.sub);
  if (!admin) return fail(401, "Sign in to continue.");

  if (!(await verifyPassword(current, admin.password_hash))) {
    return fail(400, "Please check the highlighted fields.", {
      current: "That is not your current password.",
    });
  }

  await changePassword(admin.id, next);
  return ok({ ok: true });
});
