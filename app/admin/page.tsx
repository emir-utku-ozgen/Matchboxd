import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  CalendarDays,
  FileText,
  Users,
  Database,
  ShieldCheck,
  Activity,
  RefreshCw,
} from "lucide-react";
import UserTable, { type UserRow } from "./_components/UserTable";
import ReviewTable, { type ReviewRow } from "./_components/ReviewTable";
import SyncButton from "./_components/SyncButton";

export const dynamic = "force-dynamic";

// ─────────────────────────────────────────────────────────────────────────────
// VERİ ÇEKME FONKSİYONLARI
// ─────────────────────────────────────────────────────────────────────────────

async function getAdminData() {
  const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const [
    matchCount,
    reviewCount,
    userCount,
    recentReviewCount,
    competitions,
    rawUsers,
    rawReviews,
  ] = await Promise.all([
    prisma.match.count(),
    prisma.review.count(),
    prisma.user.count(),
    // Son 24 saatteki analiz sayısı — "moderasyon gerektiren" metriği
    prisma.review.count({ where: { createdAt: { gte: since24h } } }),
    // Lig dağılımı
    prisma.match.groupBy({
      by: ["competition"],
      _count: { id: true },
      orderBy: { _count: { id: "desc" } },
    }),
    // Kullanıcı listesi — her biri için review count
    prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        _count: { select: { reviews: true } },
      },
    }),
    // Son 10 analiz — moderasyon için
    prisma.review.findMany({
      orderBy: { createdAt: "desc" },
      take: 10,
      select: {
        id: true,
        userName: true,
        content: true,
        rating: true,
        createdAt: true,
        matchId: true,
        match: {
          select: { homeTeamName: true, awayTeamName: true },
        },
        user: {
          select: { email: true },
        },
      },
    }),
  ]);

  // Prisma Date'lerini ISO string'e dönüştür (Client Component'e geçiş için)
  const users: UserRow[] = rawUsers.map((u) => ({
    id:          u.id,
    name:        u.name,
    email:       u.email,
    role:        u.role,
    createdAt:   u.createdAt.toISOString(),
    reviewCount: u._count.reviews,
  }));

  const reviews: ReviewRow[] = rawReviews.map((r) => ({
    id:        r.id,
    userName:  r.userName,
    userEmail: r.user?.email ?? null,
    matchId:   r.matchId,
    matchName: `${r.match.homeTeamName} - ${r.match.awayTeamName}`,
    content:   r.content,
    rating:    r.rating,
    createdAt: r.createdAt.toISOString(),
  }));

  return {
    matchCount,
    reviewCount,
    userCount,
    recentReviewCount,
    competitions,
    users,
    reviews,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// SAYFA
// ─────────────────────────────────────────────────────────────────────────────

export default async function AdminPage() {
  const session = await getServerSession(authOptions);
  const data    = await getAdminData();

  return (
    <div className="min-h-screen bg-[var(--background)]">
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">

        {/* ── Başlık ──────────────────────────────────────────────────────── */}
        <div className="mb-10">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-500/15">
              <ShieldCheck className="h-5 w-5 text-red-400" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-[var(--foreground)]">Admin Paneli</h1>
              <p className="text-sm text-[var(--muted)]">
                Platform yönetimi · {session?.user?.email}
              </p>
            </div>
          </div>
        </div>

        {/* ── 1. Platform İstatistikleri ───────────────────────────────────── */}
        <section className="mb-10">
          <SectionHeader icon={<Activity className="h-4 w-4" />} title="Platform İstatistikleri" />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                label: "Toplam Kayıtlı Kullanıcı",
                value: data.userCount,
                icon: Users,
                color: "text-[var(--stadium-green)]",
                bg:    "bg-[var(--stadium-green-muted)]",
                href:  null,
              },
              {
                label: "Son 24 Saatte Eklenen Analiz",
                value: data.recentReviewCount,
                icon:  FileText,
                color: data.recentReviewCount > 0 ? "text-amber-400" : "text-[var(--muted)]",
                bg:    data.recentReviewCount > 0 ? "bg-amber-500/15" : "bg-[var(--border)]",
                href:  null,
              },
              {
                label: "Veritabanındaki Aktif Maç",
                value: data.matchCount,
                icon:  CalendarDays,
                color: "text-blue-400",
                bg:    "bg-blue-500/15",
                href:  "/matches",
              },
              {
                label: "Toplam Analiz",
                value: data.reviewCount,
                icon:  Database,
                color: "text-violet-400",
                bg:    "bg-violet-500/15",
                href:  "/reviews",
              },
            ].map(({ label, value, icon: Icon, color, bg, href }) => {
              const card = (
                <div className="flex items-center gap-4 rounded-xl border border-[var(--border)] bg-[var(--card-bg)] p-5 transition-all hover:border-[var(--stadium-green)]/30">
                  <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${bg} ${color}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="text-xs text-[var(--muted)]">{label}</div>
                    <div className={`text-2xl font-bold tabular-nums ${color}`}>{value}</div>
                  </div>
                </div>
              );
              return href
                ? <Link key={label} href={href}>{card}</Link>
                : <div key={label}>{card}</div>;
            })}
          </div>
        </section>

        {/* ── 2. Kullanıcı Yönetim Tablosu ────────────────────────────────── */}
        <section className="mb-10">
          <SectionHeader
            icon={<Users className="h-4 w-4" />}
            title="Kullanıcı Yönetimi"
            subtitle={`${data.userCount} kayıtlı kullanıcı`}
          />
          <UserTable initialUsers={data.users} />
        </section>

        {/* ── 3. İçerik Moderasyon Paneli ─────────────────────────────────── */}
        <section className="mb-10">
          <SectionHeader
            icon={<FileText className="h-4 w-4" />}
            title="İçerik Moderasyonu"
            subtitle="Son 10 analiz · Uygunsuz içerikleri buradan kaldır"
            badge={data.recentReviewCount > 0 ? `${data.recentReviewCount} yeni` : undefined}
          />
          <ReviewTable initialReviews={data.reviews} />
        </section>

        {/* ── 4. Lig / Kategori Dağılımı ──────────────────────────────────── */}
        {data.competitions.length > 0 && (
          <section className="mb-10">
            <SectionHeader
              icon={<Database className="h-4 w-4" />}
              title="Lig / Kategori Dağılımı"
            />
            <div className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--card-bg)]">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--border)] bg-white/[0.02]">
                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
                      Lig / Kategori
                    </th>
                    <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
                      Maç Sayısı
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {data.competitions.map((c) => (
                    <tr key={c.competition} className="hover:bg-white/5">
                      <td className="px-5 py-3 font-medium text-[var(--foreground)]">
                        {c.competition}
                      </td>
                      <td className="px-5 py-3 text-right font-semibold text-[var(--stadium-green)] tabular-nums">
                        {c._count.id}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* ── 5. Veritabanı Senkronizasyonu ───────────────────────────────── */}
        <section className="mb-10">
          <SectionHeader
            icon={<RefreshCw className="h-4 w-4" />}
            title="Veritabanı Senkronizasyonu"
            subtitle="Football Data API"
          />
          <div className="rounded-xl border border-[var(--border)] bg-[var(--card-bg)] p-6">
            <p className="mb-5 text-sm text-[var(--muted)]">
              <strong className="text-[var(--foreground)]">football-data.org</strong> API'si üzerinden
              son 7 gün ile önümüzdeki 7 günün maçlarını otomatik olarak çekip veritabanına ekler / günceller.
              Mevcut kayıtlar <code className="rounded bg-[var(--background)] px-1.5 py-0.5 text-xs text-[var(--foreground)]">externalId</code> üzerinden{" "}
              <strong className="text-[var(--foreground)]">upsert</strong> ile mükerrer olmadan güncellenir.
            </p>

            {/* Senkronizasyon butonu (Client Component) */}
            <SyncButton />

            {/* Manuel yöntem ayırıcı */}
            <div className="my-6 flex items-center gap-3">
              <div className="h-px flex-1 bg-[var(--border)]" />
              <span className="text-xs text-[var(--muted)]">veya manuel yöntem</span>
              <div className="h-px flex-1 bg-[var(--border)]" />
            </div>

            {/* Seed rehberi */}
            <p className="mb-4 text-sm text-[var(--muted)]">
              Özel / elle oluşturulan maçlar için seed scripti kullanın:
            </p>
            <ol className="mb-5 list-inside list-decimal space-y-2 text-sm text-[var(--muted)]">
              <li>
                <code className="rounded bg-[var(--background)] px-1.5 py-0.5 text-xs text-[var(--foreground)]">
                  prisma/real-matches.ts
                </code>{" "}
                dosyasını düzenle.
              </li>
              <li>
                Terminalde{" "}
                <code className="rounded bg-[var(--background)] px-1.5 py-0.5 text-xs text-[var(--foreground)]">
                  npm run db:seed
                </code>{" "}
                çalıştır.
              </li>
            </ol>
            <div className="rounded-lg bg-[var(--background)] px-4 py-3 font-mono text-xs text-[var(--stadium-green)]">
              npm run db:seed
            </div>
          </div>
        </section>

        {/* ── 6. Hızlı Erişim ─────────────────────────────────────────────── */}
        <section>
          <SectionHeader title="Hızlı Erişim" />
          <div className="grid gap-3 sm:grid-cols-3">
            {[
              { href: "/matches",     label: "Maç Listesi",   desc: "Tüm maçları görüntüle" },
              { href: "/stats",       label: "İstatistikler", desc: "Analiz raporları"       },
              { href: "/collections", label: "Koleksiyonlar", desc: "Kullanıcı listeleri"    },
            ].map(({ href, label, desc }) => (
              <Link
                key={href}
                href={href}
                className="rounded-xl border border-[var(--border)] bg-[var(--card-bg)] px-5 py-4 transition-all hover:border-[var(--stadium-green)]/50 hover:shadow-[0_0_16px_rgba(34,197,94,0.08)]"
              >
                <div className="font-medium text-[var(--foreground)]">{label}</div>
                <div className="mt-0.5 text-xs text-[var(--muted)]">{desc}</div>
              </Link>
            ))}
          </div>
        </section>

      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// YARDIMCI: Section Başlığı
// ─────────────────────────────────────────────────────────────────────────────

function SectionHeader({
  icon,
  title,
  subtitle,
  badge,
}: {
  icon?: React.ReactNode;
  title: string;
  subtitle?: string;
  badge?: string;
}) {
  return (
    <div className="mb-4 flex items-center gap-2">
      {icon && (
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--stadium-green-muted)] text-[var(--stadium-green)]">
          {icon}
        </span>
      )}
      <h2 className="text-lg font-semibold text-[var(--stadium-green)]">{title}</h2>
      {subtitle && (
        <span className="text-sm text-[var(--muted)]">· {subtitle}</span>
      )}
      {badge && (
        <span className="ml-auto rounded-full bg-amber-500/20 px-2.5 py-0.5 text-xs font-semibold text-amber-400">
          {badge}
        </span>
      )}
    </div>
  );
}
