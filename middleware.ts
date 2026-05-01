/**
 * Next.js Edge Middleware — Çok Katmanlı Rota Koruması
 *
 * Rol hiyerarşisi:
 *   user   → yalnızca genel sayfalar
 *   editor → /editor/* + genel sayfalar
 *   admin  → her şey (/admin/*, /editor/*, genel sayfalar)
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

  // ── /editor/* — "editor" VEYA "admin" rolü ───────────────────────────────
  if (pathname.startsWith("/editor")) {
    const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });

    if (!token) {
      const url = new URL("/login", request.url);
      url.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(url);
    }

    const role = token.role as string | undefined;
    if (role !== "admin" && role !== "editor") {
      return NextResponse.redirect(new URL("/unauthorized", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  // Her iki route grubunu da yakala; statik dosyalar ve API rotaları hariç
  matcher: ["/admin/:path*", "/editor/:path*"],
};
