/**
 * Next.js Edge Middleware — Rota Koruması
 *
 * Rol yapısı:
 *   user  → genel sayfalar + /my-reviews
 *   admin → her şey (+ /admin/*)
 *
 * Avantaj: Veritabanına dokunmadan JWT içindeki `role` alanıyla karar verir.
 * Kısıt  : Rol değişikliği ancak yeniden oturum açıldığında yansır.
 */

import { getToken } from "next-auth/jwt";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // ── /admin/* — yalnızca "admin" rolü ─────────────────────────────────────
  if (pathname.startsWith("/admin")) {
    const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });

    if (!token) {
      const url = new URL("/login", request.url);
      url.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(url);
    }

    if (token.role !== "admin") {
      return NextResponse.redirect(new URL("/unauthorized", request.url));
    }
  }

  // ── /my-reviews/* — giriş yapmış her kullanıcı ────────────────────────────
  if (pathname.startsWith("/my-reviews")) {
    const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });

    if (!token) {
      const url = new URL("/login", request.url);
      url.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/my-reviews",
    "/my-reviews/:path*",
  ],
};
