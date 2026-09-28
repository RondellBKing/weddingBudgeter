import { NextResponse, type NextRequest } from "next/server";
import {
  createSessionToken,
  sessionCookieName,
  sessionCookieOptions,
  shouldRenew,
  verifySessionToken,
} from "@/lib/auth/session";

// Fast gate in front of every route: no valid signed cookie, no page. It deliberately doesn't
// touch the database; requireSession() does the full check (including "log out everywhere")
// inside every page, Server Action and route handler.

const PUBLIC_PATHS = new Set(["/login", "/api/login"]);

export async function proxy(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  if (PUBLIC_PATHS.has(pathname)) return NextResponse.next();

  const token = req.cookies.get(sessionCookieName())?.value;
  const session = token ? await verifySessionToken(token) : null;

  if (!session) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Not signed in" }, { status: 401 });
    }
    const url = new URL("/login", req.url);
    if (pathname !== "/") url.searchParams.set("next", pathname + search);
    return NextResponse.redirect(url);
  }

  const res = NextResponse.next();
  if (shouldRenew(session)) {
    res.cookies.set(sessionCookieName(), await createSessionToken(session.epoch), sessionCookieOptions());
  }
  return res;
}

export const config = {
  // Everything except build assets and the icon/robots files.
  matcher: ["/((?!_next/static|_next/image|favicon\\.ico|robots\\.txt|icon\\.svg|apple-icon\\.png).*)"],
};
