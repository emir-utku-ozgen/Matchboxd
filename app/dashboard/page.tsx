import Link from "next/link";
import { prisma } from "@/lib/db";
import { Trophy, FileText, CalendarDays } from "lucide-react";

export const dynamic = "force-dynamic";

async function getDashboardStats() {
  const [matchCount, reviewCount, reviewsWithMatch] = await Promise.all([
    prisma.match.count(),
    prisma.review.count(),
    prisma.review.findMany({
      include: { match: true },
    }),
  ]);

  // En yüksek ortalama puanlı maç
  const matchRatings: Record<string, { sum: number; count: number; name: string }> = {};
  for (const r of reviewsWithMatch) {
    const key = r.matchId;
    if (!matchRatings[key]) {
      matchRatings[key] = {
        sum: 0,
        count: 0,
        name: `${r.match.homeTeamName} - ${r.match.awayTeamName}`,
      };
    }
    matchRatings[key].sum += r.rating;
    matchRatings[key].count += 1;
  }

  const topMatch = Object.entries(matchRatings)
    .filter(([, v]) => v.count > 0)
    .map(([id, v]) => ({
      id,
      name: v.name,
      avg: v.sum / v.count,
      count: v.count,
    }))
    .sort((a, b) => b.avg - a.avg)[0];

  return { matchCount, reviewCount, topMatch };
}

export default async function DashboardPage() {
  const stats = await getDashboardStats();

  return (
    <div className="min-h-screen bg-[var(--background)]">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <h1 className="mb-2 text-3xl font-bold text-[var(--foreground)]">
          Dashboard
        </h1>
        <p className="mb-10 text-[var(--muted)]">
          Özet istatistikler ve platform aktivitesi.
        </p>

        {/* İstatistik kartları */}
        <div className="mb-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <Link
            href="/matches"
            className="group flex items-center gap-4 rounded-xl border border-[var(--border)] bg-[var(--card-bg)] p-6 transition-all hover:border-[var(--stadium-green)]/50 hover:shadow-[0_0_24px_rgba(34,197,94,0.1)]"
          >
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[var(--stadium-green-muted)] text-[var(--stadium-green)] group-hover:bg-[var(--stadium-green)]/20">
              <CalendarDays className="h-6 w-6" />
            </div>
            <div>
              <div className="text-sm text-[var(--muted)]">Toplam Maç</div>
              <div className="text-2xl font-bold text-[var(--stadium-green)]">
                {stats.matchCount}
              </div>
            </div>
          </Link>

          <Link
            href="/reviews"
            className="group flex items-center gap-4 rounded-xl border border-[var(--border)] bg-[var(--card-bg)] p-6 transition-all hover:border-[var(--stadium-green)]/50 hover:shadow-[0_0_24px_rgba(34,197,94,0.1)]"
          >
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[var(--stadium-green-muted)] text-[var(--stadium-green)] group-hover:bg-[var(--stadium-green)]/20">
              <FileText className="h-6 w-6" />
            </div>
            <div>
              <div className="text-sm text-[var(--muted)]">Yapılan Analiz</div>
              <div className="text-2xl font-bold text-[var(--stadium-green)]">
                {stats.reviewCount}
              </div>
            </div>
          </Link>

          <div className="flex items-center gap-4 rounded-xl border border-[var(--border)] bg-[var(--card-bg)] p-6">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[var(--stadium-green-muted)] text-[var(--stadium-green)]">
              <Trophy className="h-6 w-6" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-sm text-[var(--muted)]">
                En Yüksek Puanlı Maç
              </div>
              <div className="truncate font-semibold text-[var(--foreground)]">
                {stats.topMatch
                  ? `${stats.topMatch.name} (${stats.topMatch.avg.toFixed(1)}/10, ${stats.topMatch.count} analiz)`
                  : "—"}
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-[var(--border)] bg-[var(--card-bg)] p-8 text-center text-[var(--muted)]">
          Daha fazla aktivite ve grafikler ileride eklenecek.
        </div>
      </div>
    </div>
  );
}
