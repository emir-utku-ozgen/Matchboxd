import Link from "next/link";
import { prisma } from "@/lib/db";
import { Trophy, FileText, CalendarDays } from "lucide-react";
import ActivityChart, { type ActivityDay } from "@/components/dashboard/ActivityChart";
import ActivityFeed, { type RecentReview } from "@/components/dashboard/ActivityFeed";
import TrendingMatches, { type TrendingMatch } from "@/components/dashboard/TrendingMatches";

export const dynamic = "force-dynamic";

// ─────────────────────────────────────────────────────────────────────────────
// VERİTABANI SORGU FONKSİYONLARI
// ─────────────────────────────────────────────────────────────────────────────

async function getDashboardStats() {
  const [matchCount, reviewCount, reviewsWithMatch] = await Promise.all([
    prisma.match.count(),
    prisma.review.count(),
    prisma.review.findMany({ include: { match: true } }),
  ]);

  const matchRatings: Record<string, { sum: number; count: number; name: string; id: string }> = {};
  for (const r of reviewsWithMatch) {
    if (!matchRatings[r.matchId]) {
      matchRatings[r.matchId] = {
        id: r.matchId,
        sum: 0,
        count: 0,
        name: `${r.match.homeTeamName} - ${r.match.awayTeamName}`,
      };
    }
    matchRatings[r.matchId].sum += r.rating;
    matchRatings[r.matchId].count += 1;
  }

  const topMatch = Object.values(matchRatings)
    .filter((v) => v.count > 0)
    .map((v) => ({ ...v, avg: v.sum / v.count }))
    .sort((a, b) => b.avg - a.avg)[0];

  return { matchCount, reviewCount, topMatch };
}

/**
 * Son 7 günlük aktivite verisi.
 *
 * Prisma sorgusu:
 *   const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
 *   const reviews = await prisma.review.findMany({
 *     where: { createdAt: { gte: since } },
 *     select: { createdAt: true, rating: true },
 *     orderBy: { createdAt: "asc" },
 *   });
 *
 * Dönen veriyle her günün analizlerini gruplandırıp ActivityDay dizisi oluşturun.
 * Veri yoksa aşağıdaki DUMMY_ACTIVITY_DATA devreye girer.
 */
async function getActivityData(): Promise<ActivityDay[]> {
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const reviews = await prisma.review.findMany({
    where: { createdAt: { gte: since } },
    select: { createdAt: true, rating: true },
    orderBy: { createdAt: "asc" },
  });

  // Son 7 günü oluştur (bugün dahil)
  const days: ActivityDay[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
    const dayStr = d.toISOString().slice(0, 10);
    const label = d.toLocaleDateString("tr-TR", { weekday: "short" });

    const dayReviews = reviews.filter(
      (r) => r.createdAt.toISOString().slice(0, 10) === dayStr
    );
    const count = dayReviews.length;
    const avgRating =
      count > 0
        ? Math.round((dayReviews.reduce((s, r) => s + r.rating, 0) / count) * 10) / 10
        : 0;

    days.push({ label, reviews: count, avgRating });
  }

  // Eğer son 7 günde hiç veri yoksa görsel açıdan anlamlı demo verisi döndür
  const hasRealData = days.some((d) => d.reviews > 0);
  if (!hasRealData) return DUMMY_ACTIVITY_DATA;

  return days;
}

/**
 * Son 8 analiz.
 *
 * Prisma sorgusu:
 *   prisma.review.findMany({
 *     include: {
 *       match: {
 *         select: { id: true, homeTeamName: true, awayTeamName: true,
 *                   competition: true, homeScore: true, awayScore: true }
 *       }
 *     },
 *     orderBy: { createdAt: "desc" },
 *     take: 8,
 *   });
 */
async function getRecentReviews(): Promise<RecentReview[]> {
  const rows = await prisma.review.findMany({
    include: {
      match: {
        select: {
          id: true,
          homeTeamName: true,
          awayTeamName: true,
          competition: true,
          homeScore: true,
          awayScore: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 8,
  });

  if (rows.length === 0) return DUMMY_RECENT_REVIEWS;

  return rows.map((r) => ({
    id: r.id,
    userName: r.userName,
    matchId: r.matchId,
    matchName: `${r.match.homeTeamName} - ${r.match.awayTeamName}`,
    competition: r.match.competition,
    homeScore: r.match.homeScore,
    awayScore: r.match.awayScore,
    rating: r.rating,
    content: r.content,
    createdAt: r.createdAt.toISOString(),
  }));
}

/**
 * Son 30 günde en çok analiz edilen 5 maç.
 *
 * Prisma sorgusu:
 *   const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
 *   const grouped = await prisma.review.groupBy({
 *     by: ["matchId"],
 *     where: { createdAt: { gte: since } },
 *     _count: { matchId: true },
 *     _avg: { rating: true, weightedRating: true },
 *     orderBy: { _count: { matchId: "desc" } },
 *     take: 5,
 *   });
 *
 * Ardından match detaylarını prisma.match.findMany ile çekin.
 */
async function getTrendingMatches(): Promise<TrendingMatch[]> {
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const grouped = await prisma.review.groupBy({
    by: ["matchId"],
    where: { createdAt: { gte: since } },
    _count: { matchId: true },
    _avg: { rating: true, weightedRating: true },
    orderBy: { _count: { matchId: "desc" } },
    take: 5,
  });

  if (grouped.length === 0) return DUMMY_TRENDING_MATCHES;

  const matchIds = grouped.map((g) => g.matchId);
  const matches = await prisma.match.findMany({
    where: { id: { in: matchIds } },
    select: {
      id: true,
      homeTeamName: true,
      awayTeamName: true,
      homeCrest: true,
      awayCrest: true,
      competition: true,
      homeScore: true,
      awayScore: true,
    },
  });

  const matchMap = new Map(matches.map((m) => [m.id, m]));

  return grouped
    .map((g, idx) => {
      const m = matchMap.get(g.matchId);
      if (!m) return null;
      const avgRaw = g._avg.weightedRating ?? g._avg.rating ?? 0;
      return {
        rank: idx + 1,
        matchId: g.matchId,
        homeTeamName: m.homeTeamName,
        awayTeamName: m.awayTeamName,
        homeCrest: m.homeCrest,
        awayCrest: m.awayCrest,
        competition: m.competition,
        homeScore: m.homeScore,
        awayScore: m.awayScore,
        reviewCount: g._count.matchId,
        avgRating: Math.round(avgRaw * 10) / 10,
      } satisfies TrendingMatch;
    })
    .filter((x): x is TrendingMatch => x !== null);
}

// ─────────────────────────────────────────────────────────────────────────────
// DUMMY DATA — Son 7 günde veri yoksa gösterilir
// Gerçek veri akınca otomatik olarak kullanılmaz.
// ─────────────────────────────────────────────────────────────────────────────

const DUMMY_ACTIVITY_DATA: ActivityDay[] = [
  { label: "Pzt", reviews: 2, avgRating: 7.0 },
  { label: "Sal", reviews: 5, avgRating: 8.2 },
  { label: "Çar", reviews: 3, avgRating: 6.8 },
  { label: "Per", reviews: 7, avgRating: 8.5 },
  { label: "Cum", reviews: 4, avgRating: 7.4 },
  { label: "Cmt", reviews: 9, avgRating: 8.8 },
  { label: "Paz", reviews: 6, avgRating: 7.9 },
];

const now = new Date();
const h = (hours: number) => new Date(now.getTime() - hours * 60 * 60 * 1000).toISOString();

const DUMMY_RECENT_REVIEWS: RecentReview[] = [
  {
    id: "demo-1",
    userName: "Ahmet",
    matchId: "demo-match-1",
    matchName: "Galatasaray - Fenerbahçe",
    competition: "Süper Lig",
    homeScore: 2,
    awayScore: 1,
    rating: 9,
    content:
      "Muhteşem bir derbi! İlk yarı Galatasaray baskısıyla geçerken ikinci yarıda Fenerbahçe geri döndü. İnanılmaz bir atmosfer vardı stadyumda.",
    createdAt: h(1),
  },
  {
    id: "demo-2",
    userName: "Zeynep",
    matchId: "demo-match-2",
    matchName: "Manchester City - Real Madrid",
    competition: "UEFA Şampiyonlar Ligi",
    homeScore: 1,
    awayScore: 3,
    rating: 8,
    content:
      "Vinicius Jr. sahayı adeta uçarak geçti. Guardiola'nın taktikleri yetmedi, Ancelotti bir kez daha sürpriz yaptı.",
    createdAt: h(3),
  },
  {
    id: "demo-3",
    userName: "Murat",
    matchId: "demo-match-3",
    matchName: "Beşiktaş - Trabzonspor",
    competition: "Süper Lig",
    homeScore: 0,
    awayScore: 0,
    rating: 5,
    content:
      "Beraberlik sonucu adil görünse de iki takım da gol şanslarını iyi değerlendiremedi. Tempo son derece düşüktü.",
    createdAt: h(6),
  },
  {
    id: "demo-4",
    userName: "Elif",
    matchId: "demo-match-4",
    matchName: "Arsenal - Liverpool",
    competition: "Premier League",
    homeScore: 3,
    awayScore: 2,
    rating: 10,
    content:
      "Bu sezonun en iyi maçlarından biri! Son dakika golü, VAR kararları ve olağanüstü bir seyir keyfi sundu.",
    createdAt: h(10),
  },
  {
    id: "demo-5",
    userName: "Kerem",
    matchId: "demo-match-5",
    matchName: "Fenerbahçe - Başakşehir",
    competition: "Süper Lig",
    homeScore: 4,
    awayScore: 1,
    rating: 7,
    content:
      "Dzeko ve Tadic'in muhteşem uyumu maçı erken kapattı. Başakşehir'in defansı kritik anlarda çöktü.",
    createdAt: h(18),
  },
  {
    id: "demo-6",
    userName: "Selin",
    matchId: "demo-match-6",
    matchName: "Bayern München - Borussia Dortmund",
    competition: "Bundesliga",
    homeScore: 2,
    awayScore: 2,
    rating: 8,
    content:
      "Klasik bir Alman derbisi. Her iki takım da ofansif futbolla göz doldurdu. Beraberlik her ikisine de adildi.",
    createdAt: h(26),
  },
];

const DUMMY_TRENDING_MATCHES: TrendingMatch[] = [
  {
    rank: 1,
    matchId: "trending-1",
    homeTeamName: "Galatasaray",
    awayTeamName: "Fenerbahçe",
    homeCrest: null,
    awayCrest: null,
    competition: "Süper Lig",
    homeScore: 2,
    awayScore: 1,
    reviewCount: 24,
    avgRating: 8.9,
  },
  {
    rank: 2,
    matchId: "trending-2",
    homeTeamName: "Arsenal",
    awayTeamName: "Liverpool",
    homeCrest: null,
    awayCrest: null,
    competition: "Premier League",
    homeScore: 3,
    awayScore: 2,
    reviewCount: 18,
    avgRating: 9.2,
  },
  {
    rank: 3,
    matchId: "trending-3",
    homeTeamName: "Manchester City",
    awayTeamName: "Real Madrid",
    homeCrest: null,
    awayCrest: null,
    competition: "UCL",
    homeScore: 1,
    awayScore: 3,
    reviewCount: 15,
    avgRating: 8.4,
  },
  {
    rank: 4,
    matchId: "trending-4",
    homeTeamName: "Bayern München",
    awayTeamName: "Dortmund",
    homeCrest: null,
    awayCrest: null,
    competition: "Bundesliga",
    homeScore: 2,
    awayScore: 2,
    reviewCount: 11,
    avgRating: 7.8,
  },
  {
    rank: 5,
    matchId: "trending-5",
    homeTeamName: "Beşiktaş",
    awayTeamName: "Trabzonspor",
    homeCrest: null,
    awayCrest: null,
    competition: "Süper Lig",
    homeScore: 0,
    awayScore: 0,
    reviewCount: 8,
    avgRating: 5.5,
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// SAYFA
// ─────────────────────────────────────────────────────────────────────────────

export default async function DashboardPage() {
  const [stats, activityData, recentReviews, trendingMatches] = await Promise.all([
    getDashboardStats(),
    getActivityData(),
    getRecentReviews(),
    getTrendingMatches(),
  ]);

  return (
    <div className="min-h-screen bg-[var(--background)]">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">

        {/* Başlık */}
        <div className="mb-10">
          <h1 className="text-3xl font-bold text-[var(--foreground)]">Dashboard</h1>
          <p className="mt-1 text-[var(--muted)]">Özet istatistikler ve platform aktivitesi.</p>
        </div>

        {/* ── Özet Kartlar ─────────────────────────────────────────────────── */}
        <div className="mb-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
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
              <div className="text-sm text-[var(--muted)]">En Yüksek Puanlı Maç</div>
              {stats.topMatch ? (
                <Link
                  href={`/matches/${stats.topMatch.id}`}
                  className="block truncate font-semibold text-[var(--foreground)] hover:text-[var(--stadium-green)]"
                >
                  {stats.topMatch.name}
                  <span className="ml-1 text-sm font-normal text-[var(--stadium-green)]">
                    ({stats.topMatch.avg.toFixed(1)}/10)
                  </span>
                </Link>
              ) : (
                <div className="truncate font-semibold text-[var(--foreground)]">—</div>
              )}
            </div>
          </div>
        </div>

        {/* ── Aktivite Grafiği ─────────────────────────────────────────────── */}
        <div className="mb-8">
          <ActivityChart data={activityData} />
        </div>

        {/* ── Alt İki Kolon: Feed + Trending ──────────────────────────────── */}
        <div className="grid gap-8 lg:grid-cols-3">
          {/* Sol: Son Aktiviteler (2 kolon) */}
          <div className="lg:col-span-2">
            <ActivityFeed reviews={recentReviews} />
          </div>

          {/* Sağ: Gündemde (1 kolon) */}
          <div>
            <TrendingMatches matches={trendingMatches} />
          </div>
        </div>

      </div>
    </div>
  );
}
