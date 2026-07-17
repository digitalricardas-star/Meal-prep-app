import { NextResponse } from "next/server";

// Shared-password gate. Set APP_PASSWORD (env) to turn it on; leave it unset
// and the app stays completely open (no gate), so it can never lock you out.
export function middleware(req) {
  const pw = process.env.APP_PASSWORD;
  if (!pw) return NextResponse.next();

  const { pathname } = req.nextUrl;
  // the login page and its API must stay reachable
  if (pathname === "/login" || pathname === "/api/login") {
    return NextResponse.next();
  }

  const authed = req.cookies.get("mp_auth")?.value === pw;
  if (authed) return NextResponse.next();

  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = req.nextUrl.clone();
  url.pathname = "/login";
  return NextResponse.redirect(url);
}

// Run on everything except Next internals and static files (anything with a dot).
export const config = {
  matcher: ["/((?!_next|.*\\..*).*)"],
};
