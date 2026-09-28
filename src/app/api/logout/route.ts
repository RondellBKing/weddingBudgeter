import { NextResponse, type NextRequest } from "next/server";
import { isSameOrigin } from "@/lib/auth/request";
import { sessionCookieName } from "@/lib/auth/session";

export async function POST(req: NextRequest) {
  if (!isSameOrigin(req)) {
    return new NextResponse("Forbidden", { status: 403 });
  }
  const res = NextResponse.redirect(new URL("/login?signedOut=1", req.url), 303);
  res.cookies.delete(sessionCookieName());
  return res;
}
