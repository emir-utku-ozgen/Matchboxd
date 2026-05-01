/**
 * Matchboxd — Veritabanı Seed
 *
 * Çalıştır: npm run db:seed
 *
 * Her çalışmada `externalId` üzerinden upsert yapar:
 *   - Mevcut kayıt varsa skor / venue / formation günceller
 *   - Yoksa yeni kayıt oluşturur
 */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import { ALL_MATCHES, type RealMatchInput } from "./real-matches";

// ─── Prisma Bağlantısı ─────────────────────────────────────────────────────────
// lib/db.ts ile aynı pattern (PrismaLibSql + config object)

const databaseUrl = process.env.DATABASE_URL ?? "file:./dev.db";
const authToken   = process.env.DATABASE_AUTH_TOKEN ?? process.env.TURSO_AUTH_TOKEN;

const adapter = new PrismaLibSql({
  url:       databaseUrl,
  authToken: authToken || undefined,
});
const prisma = new PrismaClient({ adapter });

// ─── Yardımcı ─────────────────────────────────────────────────────────────────

function buildStatsJson(match: RealMatchInput): string | null {
  if (!match.homeFormation && !match.awayFormation) return null;
  return JSON.stringify({
    homeFormation: match.homeFormation ?? null,
    awayFormation: match.awayFormation ?? null,
  });
}

// ─── Ana Fonksiyon ────────────────────────────────────────────────────────────

async function main() {
  console.log(`\n🌱  Seed başlatılıyor — ${ALL_MATCHES.length} maç işlenecek\n`);

  let created = 0;
  let updated = 0;
  let errors  = 0;

  for (const match of ALL_MATCHES) {
    try {
      const statsJson = buildStatsJson(match);

      const result = await prisma.match.upsert({
        where:  { externalId: match.externalId },
        create: {
          externalId:      match.externalId,
          homeTeamName:    match.homeTeamName,
          awayTeamName:    match.awayTeamName,
          homeScore:       match.homeScore,
          awayScore:       match.awayScore,
          competition:     match.competition,
          competitionType: match.competitionType,
          season:          match.season,
          matchDate:       match.matchDate,
          venue:           match.venue,
          status:          match.status,
          statsJson,
        },
        update: {
          homeScore: match.homeScore,
          awayScore: match.awayScore,
          venue:     match.venue,
          status:    match.status,
          statsJson,
        },
      });

      // createdAt ≈ updatedAt ise yeni kayıt
      const isNew = Math.abs(result.createdAt.getTime() - result.updatedAt.getTime()) < 1000;
      if (isNew) {
        created++;
        console.log(`  ✓ Eklendi  ${result.homeTeamName} ${result.homeScore}–${result.awayScore} ${result.awayTeamName}  [${result.competition}]`);
      } else {
        updated++;
        console.log(`  ↻ Güncellendi  ${result.homeTeamName} ${result.homeScore}–${result.awayScore} ${result.awayTeamName}  [${result.competition}]`);
      }
    } catch (e) {
      errors++;
      console.error(`  ✗ Hata  ${match.homeTeamName} vs ${match.awayTeamName}:`, e);
    }
  }

  console.log(`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  ✓ Eklendi   : ${created}
  ↻ Güncellendi: ${updated}
  ✗ Hata      : ${errors}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`);
}

// ─── Çalıştır ─────────────────────────────────────────────────────────────────

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
