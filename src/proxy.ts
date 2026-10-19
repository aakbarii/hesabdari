import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { SESSION_COOKIE, verifySession } from "@/lib/auth";
import { AUTH_ENABLED } from "@/lib/app-config";

const PUBLIC_PATHS = ["/login", "/register", "/forgot-password", "/reset-password"];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  // Keep the original authentication flow below for re-enabling it later.
  if (!AUTH_ENABLED) {
    if (PUBLIC_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`))) {
      return NextResponse.redirect(new URL("/", request.url));
    }
    if (pathname.startsWith("/api/auth/") && pathname !== "/api/auth/me") {
      return NextResponse.json({ error: "ورود و مدیریت رمز فعلاً غیرفعال است" }, { status: 403 });
    }
    return NextResponse.next();
  }

  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    (!pathname.startsWith("/api/") && /\.(?:png|jpg|jpeg|svg|webp|ico|woff2?|json|js|html)$/.test(pathname))
  ) {
    return NextResponse.next();
  }

  if (pathname === "/api/health" || pathname.startsWith("/api/auth/")) {
    return NextResponse.next();
  }

  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const userId = token ? await verifySession(token) : null;

  if (pathname.startsWith("/api/")) {
    if (!userId) {
      return NextResponse.json({ error: "لطفاً وارد شوید" }, { status: 401 });
    }
    return NextResponse.next();
  }

  if (PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    if (userId && (pathname === "/login" || pathname === "/register")) {
      return NextResponse.redirect(new URL("/", request.url));
    }
    return NextResponse.next();
  }

  if (!userId) {
    const login = new URL("/login", request.url);
    login.searchParams.set("from", pathname + request.nextUrl.search);
    return NextResponse.redirect(login);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image).*)"],
};
