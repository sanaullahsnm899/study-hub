import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  CSRF_COOKIE,
  CSRF_HEADER,
  SESSION_COOKIE,
  type SessionPayload,
  verifySessionToken,
} from "./session";

/** Current admin session from the request cookies, or null. */
export async function getSession(): Promise<SessionPayload | null> {
  const store = await cookies();
  return verifySessionToken(store.get(SESSION_COOKIE)?.value);
}

/** For server components under /admin — redirects to the login page. */
export async function requireSession(returnTo?: string): Promise<SessionPayload> {
  const session = await getSession();
  if (!session) {
    redirect(`/admin/login${returnTo ? `?next=${encodeURIComponent(returnTo)}` : ""}`);
  }
  return session;
}

export class HttpError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly details?: unknown,
  ) {
    super(message);
  }
}

/**
 * Authorisation for admin API routes.
 * - verifies the signed session cookie
 * - enforces double-submit CSRF on state-changing verbs
 * - enforces same-origin for state-changing verbs
 */
export async function requireApiAdmin(req: Request): Promise<SessionPayload> {
  const store = await cookies();
  const session = verifySessionToken(store.get(SESSION_COOKIE)?.value);
  if (!session) throw new HttpError(401, "Sign in to continue.");

  const method = req.method.toUpperCase();
  if (!["GET", "HEAD", "OPTIONS"].includes(method)) {
    const cookieToken = store.get(CSRF_COOKIE)?.value;
    const headerToken = req.headers.get(CSRF_HEADER);
    if (!cookieToken || !headerToken || cookieToken !== headerToken) {
      throw new HttpError(403, "Your session expired. Reload the page and try again.");
    }
    const origin = req.headers.get("origin");
    if (origin) {
      const host = req.headers.get("host");
      try {
        if (new URL(origin).host !== host) throw new HttpError(403, "Cross-origin request blocked.");
      } catch {
        throw new HttpError(403, "Cross-origin request blocked.");
      }
    }
  }
  return session;
}
