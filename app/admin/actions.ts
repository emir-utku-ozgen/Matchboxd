"use server";

/**
 * Admin Server Actions
 * Her aksiyon önce oturumu ve rolü doğrular — middleware/layout'a ek olarak
 * sunucu tarafında da yetki kontrolü sağlar (Defense in Depth).
 */

import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

// ─── Football Data API tipleri (v4) ──────────────────────────────────────────

interface FdTeam   { id: number; name: string; crest: string | null }
interface FdScore  { fullTime: { home: number | null; away: number | null } }
interface FdSeason { startDate: string }
interface FdMatch  {
  id:          number;
  utcDate:     string;
  status:      string;
  venue:       string | null;
  competition: { id: number; name: string; code: string };
  season:      FdSeason;
  homeTeam:    FdTeam;
  awayTeam:    FdTeam;
  score:       FdScore;
}

export type SyncResult = {
  added:   number;
  updated: number;
  total:   number;
};

// ─── Yardımcı: Admin kontrolü ────────────────────────────────────────────────

async function assertAdmin() {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "admin") {
    throw new Error("Bu işlem için yönetici yetkisi gerekiyor.");
  }
}

// ─── Kullanıcı Silme ─────────────────────────────────────────────────────────

/**
 * Kullanıcıyı ve ona ait tüm analizleri siler.
 *
 * Prisma schema'da Review.userId onDelete: SetNull tanımlı olduğundan
 * cascade otomatik gerçekleşmez. Bu yüzden önce reviewlar manuel siliniyor.
 * Collection → CollectionMatch onDelete: Cascade olduğundan user.delete()
 * yeterli (koleksiyonlar ve içindeki maçlar otomatik temizlenir).
 */
export async function deleteUser(userId: string): Promise<void> {
  await assertAdmin();

  if (!userId) throw new Error("userId zorunludur.");

  // env-admin sanal hesabı silinemesin (DB kaydı yok)
  if (userId === "env-admin") {
    throw new Error("Bu sistem hesabı silinemez.");
  }

  // 1. Önce bağlı analizleri sil
  await prisma.review.deleteMany({ where: { userId } });

  // 2. Kullanıcıyı sil (Collection → CollectionMatch cascade ile temizlenir)
  await prisma.user.delete({ where: { id: userId } });

  revalidatePath("/admin");
}

// ─── Analiz Silme ─────────────────────────────────────────────────────────────

/**
 * Tek bir analizi moderasyon amacıyla siler.
 */
export async function deleteReview(reviewId: string): Promise<void> {
  await assertAdmin();

  if (!reviewId) throw new Error("reviewId zorunludur.");

  await prisma.review.delete({ where: { id: reviewId } });

  revalidatePath("/admin");
}

// ─── Maç Senkronizasyonu ──────────────────────────────────────────────────────

/**
 * Football Data API (football-data.org v4) üzerinden son 7 gün + sonraki 7 günün
 * maçlarını çekip veritabanına upsert eder.
 *
 * Gerekli ortam değişkenleri:
 *   FOOTBALL_DATA_API_KEY        → API anahtarı (zorunlu)
 *   FOOTBALL_DATA_COMPETITIONS   → Virgülle ayrılmış lig kodları (isteğe bağlı)
 *                                  Varsayılan: "PL,PD,BL1,SA,FL1"
 *                                  Türkiye Süper Ligi için "TL" ekleyin (ücretli plan)
 */
export async function syncMatches(): Promise<SyncResult> {
  await assertAdmin();

  const apiKey = process.env.FOOTBALL_DATA_API_KEY;
  if (!apiKey) {
    throw new Error(
      "FOOTBALL_DATA_API_KEY ortam değişkeni tanımlı değil. " +
      ".env dosyanıza ekleyin: FOOTBALL_DATA_API_KEY=your_key_here"
    );
  }

  const competitions =
    process.env.FOOTBALL_DATA_COMPETITIONS ?? "PL,PD,BL1,SA,FL1";

  // Tarih aralığı: -7 gün … +7 gün
  const fmtDate = (d: Date) => d.toISOString().slice(0, 10);
  const dateFrom = fmtDate(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000));
  const dateTo   = fmtDate(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000));

  const params = new URLSearchParams({ dateFrom, dateTo, competitions });
  const apiUrl = `https://api.football-data.org/v4/matches?${params}`;

  const res = await fetch(apiUrl, {
    headers: { "X-Auth-Token": apiKey },
    cache: "no-store",
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(
      `Football Data API hatası: ${res.status} ${res.statusText}. ` +
      `${body.slice(0, 300)}`
    );
  }

  const json = (await res.json()) as { matches?: FdMatch[] };
  const apiMatches: FdMatch[] = Array.isArray(json.matches) ? json.matches : [];

  if (apiMatches.length === 0) {
    return { added: 0, updated: 0, total: 0 };
  }

  // Senkronizasyon öncesi mevcut kayıt sayısı (externalId'li maçlar)
  const countBefore = await prisma.match.count({
    where: { externalId: { not: null } },
  });

  // Her maçı upsert et
  for (const m of apiMatches) {
    const externalId  = String(m.id);
    const homeScore   = m.score.fullTime.home ?? 0;
    const awayScore   = m.score.fullTime.away ?? 0;
    const matchDate   = new Date(m.utcDate);
    const seasonYear  = m.season?.startDate
      ? new Date(m.season.startDate).getFullYear()
      : matchDate.getFullYear();
    const season      = `${seasonYear}/${seasonYear + 1}`;
    const venue       = m.venue ?? m.homeTeam.name;

    await prisma.match.upsert({
      where: { externalId },
      create: {
        externalId,
        homeTeamName:    m.homeTeam.name,
        awayTeamName:    m.awayTeam.name,
        homeCrest:       m.homeTeam.crest ?? null,
        awayCrest:       m.awayTeam.crest ?? null,
        homeScore,
        awayScore,
        competition:     m.competition.name,
        competitionType: "league",
        season,
        matchDate,
        venue,
        status:          m.status ?? null,
      },
      update: {
        // Sadece değişebilecek alanları güncelle
        homeScore,
        awayScore,
        status:    m.status ?? null,
        homeCrest: m.homeTeam.crest ?? null,
        awayCrest: m.awayTeam.crest ?? null,
      },
    });
  }

  const countAfter = await prisma.match.count({
    where: { externalId: { not: null } },
  });

  const added   = countAfter - countBefore;
  const total   = apiMatches.length;
  const updated = Math.max(0, total - added);

  revalidatePath("/admin");
  revalidatePath("/matches");
  revalidatePath("/dashboard");

  return { added, updated, total };
}
