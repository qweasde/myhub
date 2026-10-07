import { NextResponse, type NextRequest } from "next/server";

const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:8000";

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Optimistic check only: no session cookie -> straight to /login.
  // The real check is /api/v1/me in the dashboard shell (the cookie may be expired).
  if (pathname.startsWith("/dashboard")) {
    if (!request.cookies.has("sessionid")) {
      const url = new URL("/login", request.url);
      url.searchParams.set("next", pathname);
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }

  // Public profile: the page streams, so once it starts a notFound() can only send a soft
  // 404 with status 200. Check existence here, before rendering, to return a real 404.
  const username = pathname.match(/^\/(?:@|u\/)([^/]+)\/?$/)?.[1];
  if (username) {
    const res = await fetch(`${BACKEND_URL}/api/v1/profiles/${username}`, { method: "HEAD" });
    if (res.status === 404) {
      // No route matches this path, so Next renders app/not-found.tsx
      return NextResponse.rewrite(new URL("/_profile-not-found", request.url), { status: 404 });
    }
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/@:username", "/u/:username"],
};
