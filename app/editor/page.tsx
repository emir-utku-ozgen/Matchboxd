import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { PenSquare, CalendarDays, FileText, Plus } from "lucide-react";

export const dynamic = "force-dynamic";

async function getEditorStats() {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const [matchCount, recentMatches, recentReviews] = await Promise.all([
    prisma.match.count(),
    prisma.match.findMany({
      orderBy: { createdAt: "desc" },
      take: 10,
      select: {
        id: true,
        homeTeamName: true,
        awayTeamName: true,
        homeScore: true,
        awayScore: true,
        competition: true,
        matchDate: true,
        status: true,
        _count: { select: { reviews: true } },
      },
    }),
    prisma.review.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
  ]);
  return { matchCount, recentMatches, recentReviews };
}

export default async function EditorPage() {
  const session = await getServerSession(authOptions);
  const { matchCount, recentMatches, recentReviews } = await getEditorStats();

  return (
    <div className="min-h-screen bg-[var(--background)]">
      <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">

        {/* Başlık */}
        <div className="mb-8 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/15">
            <PenSquare className="h-5 w-5 text-amber-400" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-[var(--foreground)]">İçerik Yönetimi</h1>
            <p className="text-sm text-[var(--muted)]">
              Editor paneli · {session?.user?.email}
            </p>
          </div>
        </div>

        {/* Özet kartlar */}
        <div className="mb-8 grid gap-4 sm:grid-cols-3">
          {[
            {
              label: "Toplam Maç",
              value: matchCount,
              icon: CalendarDays,
              color: "text-[var(--stadium-green)]",
              bg: "bg-[var(--stadium-green-muted)]",
              href: "/matches",
            },
            {
              label: "Son 7 Günde Eklenen Analiz",
              value: recentReviews,
              icon: FileText,
              color: "text-amber-400",
              bg: "bg-amber-500/15",
              href: "/reviews",
            },
            {
              label: "Son 10 Maç",
              value: recentMatches.length,
              icon: PenSquare,
              color: "text-blue-400",
              bg: "bg-blue-500/15",
              href: null,
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

        {/* Son maçlar */}
        <section className="mb-8">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-amber-400">Son Eklenen Maçlar</h2>
            <Link
              href="/matches"
              className="text-sm text-[var(--stadium-green)] hover:underline"
            >
              Tümünü Gör →
            </Link>
          </div>

          <div className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--card-bg)]">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--border)] bg-white/[0.02]">
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">Maç</th>
                  <th className="hidden px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--muted)] sm:table-cell">Lig</th>
                  <th className="hidden px-5 py-3 text-center text-xs font-semibold uppercase tracking-wider text-[var(--muted)] md:table-cell">Analiz</th>
                  <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">Detay</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {recentMatches.map((m) => (
                  <tr key={m.id} className="hover:bg-white/[0.025]">
                    <td className="px-5 py-3">
                      <p className="font-medium text-[var(--foreground)]">
                        {m.homeTeamName}{" "}
                        <span className="font-bold text-[var(--stadium-green)]">
                          {m.homeScore}–{m.awayScore}
                        </span>{" "}
                        {m.awayTeamName}
                      </p>
                      <p className="text-xs text-[var(--muted)]">
                        {new Date(m.matchDate).toLocaleDateString("tr-TR")}
                      </p>
                    </td>
                    <td className="hidden px-5 py-3 text-[var(--muted)] sm:table-cell">
                      {m.competition}
                    </td>
                    <td className="hidden px-5 py-3 text-center tabular-nums text-[var(--muted)] md:table-cell">
                      {m._count.reviews}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <Link
                        href={`/matches/${m.id}`}
                        className="rounded-md bg-[var(--stadium-green-muted)] px-3 py-1.5 text-xs font-medium text-[var(--stadium-green)] hover:bg-[var(--stadium-green)] hover:text-white"
                      >
                        Aç
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Hızlı işlemler */}
        <section>
          <h2 className="mb-4 text-lg font-semibold text-amber-400">Hızlı İşlemler</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <Link
              href="/reviews/new"
              className="flex items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--card-bg)] px-5 py-4 transition-all hover:border-[var(--stadium-green)]/50"
            >
              <Plus className="h-5 w-5 text-[var(--stadium-green)]" />
              <div>
                <p className="font-medium text-[var(--foreground)]">Yeni Analiz Ekle</p>
                <p className="text-xs text-[var(--muted)]">Bir maç için analiz yaz</p>
              </div>
            </Link>
            <Link
              href="/matches"
              className="flex items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--card-bg)] px-5 py-4 transition-all hover:border-[var(--stadium-green)]/50"
            >
              <CalendarDays className="h-5 w-5 text-blue-400" />
              <div>
                <p className="font-medium text-[var(--foreground)]">Maçlara Göz At</p>
                <p className="text-xs text-[var(--muted)]">Tüm maçları listele ve filtrele</p>
              </div>
            </Link>
          </div>
        </section>

      </div>
    </div>
  );
}
