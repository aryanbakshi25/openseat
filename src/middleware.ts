import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { ADMIN_COOKIE, deriveToken } from "@/lib/admin-auth";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isLoginPage = pathname === "/admin/login";
  const isAuthApi = pathname === "/api/admin/auth";
  const isCronApi = pathname.startsWith("/api/cron/");

  if (isLoginPage || isAuthApi || isCronApi) {
    return NextResponse.next();
  }

  const isAdminPage = pathname.startsWith("/admin");
  const isAdminApi = pathname.startsWith("/api/admin") || pathname.startsWith("/api/staff");

  if (isAdminPage || isAdminApi) {
    const password = process.env.ADMIN_PASSWORD;
    const session = request.cookies.get(ADMIN_COOKIE)?.value;
    const expected = password ? await deriveToken(password) : null;

    if (!password || !session || session !== expected) {
      if (isAdminApi) {
        return new NextResponse(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { "Content-Type": "application/json" },
        });
      }
      return NextResponse.redirect(new URL("/admin/login", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*", "/api/staff/:path*"],
};
