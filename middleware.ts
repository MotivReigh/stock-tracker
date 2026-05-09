import { NextResponse, type NextRequest } from "next/server";

const COOKIE_NAME = "updraft_auth";

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Cron endpoints authenticate via Authorization: Bearer $CRON_SECRET, not the password gate.
  if (pathname.startsWith("/api/cron")) {
    return NextResponse.next();
  }

  const cookieValue = req.cookies.get(COOKIE_NAME)?.value;
  const expected = process.env.AUTH_TOKEN;

  if (expected && cookieValue && cookieValue === expected) {
    return NextResponse.next();
  }

  // Already on /login? Allow through.
  if (pathname === "/login") {
    return NextResponse.next();
  }

  // For API routes, return 401 JSON rather than HTML redirecting to /login.
  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const url = req.nextUrl.clone();
  url.pathname = "/login";
  url.searchParams.set("from", pathname);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: [
    // Skip Next internals and static assets; everything else passes through.
    "/((?!_next/static|_next/image|favicon.ico|robots.txt).*)",
  ],
};
