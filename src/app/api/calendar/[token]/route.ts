import type { NextRequest } from "next/server";
import { loadCalendarFeed } from "@/lib/data/calendar";
import { tokenFromPathSegment } from "@/lib/ics";

// GET /api/calendar/<token>.ics — the private calendar feed for phone calendar apps.
//
// Phones subscribe without signing in, so the proxy lets /api/calendar/ through and this route
// has no requireSession(). The secret token in the path is the credential: loadCalendarFeed()
// compares it with AuthState.icsToken in constant time and returns null on any mismatch, which
// we answer with a plain 404 (no hint that the path exists). "Log out everywhere" in Settings
// issues a new token, which turns the old link off.
//
// ?amounts=0 leaves every dollar amount out.

export async function GET(req: NextRequest, ctx: RouteContext<"/api/calendar/[token]">) {
  const { token } = await ctx.params;
  const includeAmounts = req.nextUrl.searchParams.get("amounts") !== "0";
  const body = await loadCalendarFeed(tokenFromPathSegment(token), { includeAmounts });
  if (body === null) {
    return new Response("Not found", { status: 404, headers: { "Cache-Control": "no-store" } });
  }
  return new Response(body, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'inline; filename="wedding-hq.ics"',
      "Cache-Control": "no-store",
    },
  });
}
