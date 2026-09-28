import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { verifyPassword } from "@/lib/auth/password";
import { isLoginBlocked, recordLoginAttempt } from "@/lib/auth/rate-limit";
import { clientIp, isSameOrigin, safeNextPath } from "@/lib/auth/request";
import { createSessionToken, sessionCookieName, sessionCookieOptions } from "@/lib/auth/session";

export async function POST(req: NextRequest) {
  if (!isSameOrigin(req)) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  const form = await req.formData();
  const password = String(form.get("password") ?? "");
  const next = safeNextPath(form.get("next"));
  const ip = clientIp(req);

  const back = (error: string) => {
    const url = new URL("/login", req.url);
    url.searchParams.set("error", error);
    if (next !== "/") url.searchParams.set("next", next);
    return NextResponse.redirect(url, 303);
  };

  if (await isLoginBlocked(ip)) return back("locked");

  const ok = await verifyPassword(password);
  await recordLoginAttempt(ip, ok);
  if (!ok) return back("wrong");

  const state = await prisma.authState.findUnique({ where: { id: 1 }, select: { sessionEpoch: true } });
  if (!state) return back("setup");

  const res = NextResponse.redirect(new URL(next, req.url), 303);
  res.cookies.set(sessionCookieName(), await createSessionToken(state.sessionEpoch), sessionCookieOptions());
  return res;
}
