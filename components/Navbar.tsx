"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";

const navItems = [
  { href: "/", label: "Ana Sayfa" },
  { href: "/dashboard", label: "Dashboard" },
  { href: "/matches", label: "Maçlar" },
  { href: "/reviews", label: "Analizler" },
  { href: "/collections", label: "Koleksiyonlar" },
  { href: "/admin", label: "Admin" },
];

export default function Navbar() {
  const pathname = usePathname();
  const { data: session, status } = useSession();

  return (
    <nav className="sticky top-0 z-50 border-b border-[var(--border)] bg-[var(--background)]/95 backdrop-blur supports-[backdrop-filter]:bg-[var(--background)]/80">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6">
        <Link
          href="/"
          className="flex items-center gap-2 text-lg font-semibold tracking-tight text-[var(--stadium-green)]"
        >
          <span className="text-xl">⚽</span>
          Matchboxd
        </Link>
        <div className="flex items-center gap-2">
          <ul className="flex items-center gap-1 sm:gap-2">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={`rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                      isActive
                        ? "bg-stadium-muted text-[var(--stadium-green)]"
                        : "text-[var(--foreground)]/80 hover:bg-[var(--card-bg)] hover:text-[var(--stadium-green)]"
                    }`}
                  >
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
          {status === "loading" ? (
            <span className="text-sm text-[var(--muted)]">...</span>
          ) : session?.user ? (
            <div className="flex items-center gap-2 border-l border-[var(--border)] pl-3">
              <Link
                href={`/profile/${session.user.id}`}
                className="hidden text-sm text-[var(--foreground)] hover:text-[var(--stadium-green)] sm:inline"
              >
                {session.user.name}
              </Link>
              <button
                type="button"
                onClick={() => signOut({ callbackUrl: "/" })}
                className="rounded-md px-2 py-1.5 text-sm text-[var(--muted)] hover:bg-[var(--card-bg)] hover:text-[var(--foreground)]"
              >
                Çıkış
              </button>
            </div>
          ) : (
            <Link
              href="/login"
              className="rounded-md bg-[var(--stadium-green)] px-3 py-2 text-sm font-medium text-white hover:bg-[var(--stadium-green-hover)]"
            >
              Giriş Yap
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}
