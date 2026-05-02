/**
 * Matchboxd İstatistik Servisi (Modül 5)
 * Veritabanından anlamlı raporlar üretir.
 */

import { prisma } from "@/lib/db";
import type {
  TopMatchStat,
  UserLeagueStat,
  TopMotmPlayer,
  StatsReport,
} from "@/lib/schema";

/** Son N günü kapsayan tarih döndürür */
function daysAgo(n: number): Date {
  return new Date(Date.now() - n * 24 * 60 * 60 * 1000);
}

/**
 * Son 1 ayın en yüksek ağırlıklı puanlı 5 maçını döner.
 * Ağırlıklı puan yoksa genel rating ortalaması kullanılır.
 */
export async function getTopMatchesLastMonth(limit = 5): Promise<TopMatchStat[]> {
  const since = daysAgo(30);

  // PostgreSQL'de DESC ile NULL'lar varsayılan olarak üstte gelir; NULLS LAST ile düzeltiyoruz.
  type AggRow = {
    matchId: string;
    avg_weighted: number | null;
    avg_rating: number | null;
    review_count: number;
  };

  const grouped = await prisma.$queryRaw<AggRow[]>`
    SELECT
      r."matchId",
      AVG(r."weightedRating") AS avg_weighted,
      AVG(r."rating") AS avg_rating,
      COUNT(*)::int AS review_count
    FROM "Review" r
    WHERE r."createdAt" >= ${since}
    GROUP BY r."matchId"
    ORDER BY AVG(r."weightedRating") DESC NULLS LAST, AVG(r."rating") DESC NULLS LAST
    LIMIT ${limit}
  `;

  if (grouped.length === 0) return [];

  const matchIds = grouped.map((g) => g.matchId);
  const matches = await prisma.match.findMany({
    where: { id: { in: matchIds } },
    select: {
      id: true,
      homeTeamName: true,
      awayTeamName: true,
      competition: true,
      matchDate: true,
      homeScore: true,
      awayScore: true,
    },
  });

  const matchMap = new Map(matches.map((m) => [m.id, m]));

  return grouped
    .map((g) => {
      const m = matchMap.get(g.matchId);
      if (!m) return null;
      const w = g.avg_weighted;
      const ar = g.avg_rating;
      return {
        matchId: g.matchId,
        homeTeamName: m.homeTeamName,
        awayTeamName: m.awayTeamName,
        competition: m.competition,
        matchDate: m.matchDate.toISOString(),
        homeScore: m.homeScore,
        awayScore: m.awayScore,
        avgWeightedRating:
          w != null ? Math.round(Number(w) * 10) / 10 : null,
        avgRating: Math.round((ar != null ? Number(ar) : 0) * 10) / 10,
        reviewCount: g.review_count,
      } satisfies TopMatchStat;
    })
    .filter((x): x is TopMatchStat => x !== null);
}

/**
 * Kullanıcının en çok analiz girdiği ligi ve o ligdeki en çok incelediği takımı döner.
 */
export async function getUserLeagueStat(userId: string): Promise<UserLeagueStat | null> {
  const reviews = await prisma.review.findMany({
    where: { userId },
    select: { matchId: true },
  });

  if (reviews.length === 0) return null;

  const matchIds = [...new Set(reviews.map((r) => r.matchId))];
  const matches = await prisma.match.findMany({
    where: { id: { in: matchIds } },
    select: {
      id: true,
      competition: true,
      homeTeamName: true,
      awayTeamName: true,
    },
  });

  // Her reviewda hangi maç var → maçın ligi
  const reviewMatchMap = new Map(matches.map((m) => [m.id, m]));

  // Lig bazında yorum sayısı
  const leagueCount: Record<string, number> = {};
  for (const r of reviews) {
    const m = reviewMatchMap.get(r.matchId);
    if (!m) continue;
    leagueCount[m.competition] = (leagueCount[m.competition] ?? 0) + 1;
  }

  const topLeague = Object.entries(leagueCount).sort((a, b) => b[1] - a[1])[0];
  if (!topLeague) return null;

  const [topLeagueName, reviewCountInLeague] = topLeague;

  // O ligdeki en çok yorumlanan takım (ev + deplasman)
  const leagueMatchIds = matches
    .filter((m) => m.competition === topLeagueName)
    .map((m) => m.id);

  const leagueReviews = reviews.filter((r) => leagueMatchIds.includes(r.matchId));

  const teamCount: Record<string, number> = {};
  for (const r of leagueReviews) {
    const m = reviewMatchMap.get(r.matchId);
    if (!m) continue;
    teamCount[m.homeTeamName] = (teamCount[m.homeTeamName] ?? 0) + 1;
    teamCount[m.awayTeamName] = (teamCount[m.awayTeamName] ?? 0) + 1;
  }

  const topTeamEntry = Object.entries(teamCount).sort((a, b) => b[1] - a[1])[0];

  return {
    topLeague: topLeagueName,
    reviewCountInLeague,
    favoriteTeamInLeague: topTeamEntry?.[0] ?? null,
    favoriteTeamReviewCount: topTeamEntry?.[1] ?? 0,
  };
}

/**
 * Sistem genelinde en çok "Maçın Adamı" seçilen oyuncuları döner.
 */
export async function getTopManOfTheMatch(limit = 10): Promise<TopMotmPlayer[]> {
  const grouped = await prisma.review.groupBy({
    by: ["manOfTheMatch"],
    where: { manOfTheMatch: { not: null } },
    _count: { manOfTheMatch: true },
    orderBy: { _count: { manOfTheMatch: "desc" } },
    take: limit,
  });

  return grouped
    .filter((g) => g.manOfTheMatch != null)
    .map((g) => ({
      playerName: g.manOfTheMatch as string,
      count: g._count.manOfTheMatch,
    }));
}

/**
 * Tüm modül 5 verilerini birleşik döner (frontend için hazır rapor).
 * userId geçilirse kişiselleştirilmiş lig istatistiği de eklenir.
 */
export async function getStatsReport(userId?: string): Promise<StatsReport> {
  const [topMatchesLastMonth, topMotmPlayers, userLeagueStat] = await Promise.all([
    getTopMatchesLastMonth(5),
    getTopManOfTheMatch(10),
    userId ? getUserLeagueStat(userId) : Promise.resolve(null),
  ]);

  return { topMatchesLastMonth, topMotmPlayers, userLeagueStat };
}
