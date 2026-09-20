import { NextResponse, type NextRequest } from "next/server";

/**
 * Fast path only: bounce anonymous visitors away from /admin before a page
 * renders. The signature is still verified server-side in the admin layout and
 * in every admin API route — this is a convenience, not the security boundary.
 */
export default function proxy(req: NextRequest) {
  const hasSession = Boolean(req.cookies.get("sh_session")?.value);
  const { pathname, search } = req.nextUrl;

  if (pathname === "/admin/login") {
    if (hasSession) return NextResponse.redirect(new URL("/admin", req.url));
    return NextResponse.next();
  }
  if (!hasSession) {
    const url = new URL("/admin/login", req.url);
    url.searchParams.set("next", pathname + search);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = { matcher: ["/admin", "/admin/:path*"] };
