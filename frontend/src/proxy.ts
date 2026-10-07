import { NextResponse, type NextRequest } from "next/server";

// Optimistic check only: no session cookie -> straight to /login.
// The real check is /api/v1/me in the dashboard layout (the cookie may be expired).
export function proxy(request: NextRequest) {
  if (!request.cookies.has("sessionid")) {
    const url = new URL("/login", request.url);
    url.searchParams.set("next", request.nextUrl.pathname);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: "/dashboard/:path*",
};
