"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { ShieldCheck, PenSquare } from "lucide-react";

// ─── Tip tanımları ─────────────────────────────────────────────────────────────

type Role = "user" | "editor" | "admin";

type NavItem = {
  href: string;
  label: string;
  /** Görmek için gereken minimum rol. Tanımsızsa herkese açık. */
  minRole?: "editor" | "admin";
  /** Lucide ikonu — yalnızca yetkili nav öğeleri için */
  icon?: React.ComponentType<{ className?: string }>;
};

// ─── Nav öğeleri ───────────────────────────────────────────────────────────────

const ALL_NAV_ITEMS: NavItem[] = [
  { href: "/",            label: "Ana Sayfa"     },
  { href: "/dashboard",   label: "Dashboard"     },
  { href: "/matches",     label: "Maçlar"        },
  { href: "/reviews",     label: "Analizler"     },
  { href: "/collections", label: "Koleksiyonlar" },
  { href: "/stats",       label: "İstatistikler" },
  // "editor" ve üstü → İçerik yönetimi
  { href: "/editor", label: "İçerik", icon: PenSquare, minRole: "editor" },
  // yalnızca "admin" → Yönetim paneli
  { href: "/admin",  label: "Admin",  icon: ShieldCheck, minRole: "admin"  },
];

// ─── Rol rozeti ────────────────────────────────────────────────────────────────

const ROLE_BADGE: Record<string, { label: string; cls: string }> = {
  admin:  { label: "admin",  cls: "bg-red-500/15 text-red-400"   },
  editor: { label: "editor", cls: "bg-amber-500/15 text-amber-400" },
};

// ─── Bileşen ───────────────────────────────────────────────────────────────────

export default function Navbar() {
  const pathname = usePathname();
  const { data: session, status } = useSession();

  const role: Role = (session?.user?.role as Role) ?? "user";
  const isAdmin    = role === "admin";
  const isEditor   = role === "editor";

  /** minRole hiyerarşisine göre filtrele */
  const navItems = ALL_NAV_ITEMS.filter((item) => {
    if (!item.minRole) return true;
    if (item.minRole === "editor") return isEditor || isAdmin;
    if (item.minRole === "admin")  return isAdmin;
    return true;
  });

  const badge = ROLE_BADGE[role];

  return (
    <nav className="sticky top-0 z-50 border-b border-[var(--border)] bg-[var(--background)]/95 backdrop-blur supports-[backdrop-filter]:bg-[var(--background)]/80">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6">

        {/* Logo */}
        <Link
          href="/"
          className="flex items-center gap-2 text-lg font-semibold tracking-tight text-[var(--stadium-green)]"
        >
          <span className="text-xl">⚽</span>
          Matchboxd
        </Link>

        {/* Linkler + Kullanıcı */}
        <div className="flex items-center gap-2">
          <ul className="flex items-center gap-1 sm:gap-2">
            {navItems.map((item) => {
              const isActive     = pathname === item.href || pathname.startsWith(item.href + "/");
              const isAdminItem  = item.minRole === "admin";
              const isEditorItem = item.minRole === "editor";
              const Icon         = item.icon;

              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={`inline-flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                      isActive
                        ? isAdminItem
                          ? "bg-red-500/15 text-red-400"
                          : isEditorItem
                            ? "bg-amber-500/15 text-amber-400"
                            : "bg-stadium-muted text-[var(--stadium-green)]"
                        : isAdminItem
                          ? "text-[var(--foreground)]/80 hover:bg-red-500/10 hover:text-red-400"
                          : isEditorItem
                            ? "text-[var(--foreground)]/80 hover:bg-amber-500/10 hover:text-amber-400"
                            : "text-[var(--foreground)]/80 hover:bg-[var(--card-bg)] hover:text-[var(--stadium-green)]"
                    }`}
                  >
                    {Icon && <Icon className="h-3.5 w-3.5 shrink-0" />}
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>

          {/* Kullanıcı bölümü */}
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

              {/* Admin / Editor rozeti */}
              {badge && (
                <span
                  className={`hidden rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide sm:inline ${badge.cls}`}
                >
                  {badge.label}
                </span>
              )}

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
