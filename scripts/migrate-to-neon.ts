/**
 * migrate-to-neon.ts
 *
 * Yerel dev.db (SQLite) → Neon PostgreSQL aktarım scripti.
 *
 * Kullanım:
 *   npm run db:migrate-neon
 *
 * Bağlantı URL'i .env dosyasındaki DATABASE_URL'den okunur (prisma.config.ts).
 *
 * Tablolar sırasıyla aktarılır (FK kırılmasın diye):
 *   1. User  2. Match  3. Review  4. Collection  5. CollectionMatch
 */

import "dotenv/config";
import Database from "better-sqlite3";
import { PrismaClient } from "@prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";
import { neonConfig } from "@neondatabase/serverless";
import ws from "ws";
import * as path from "path";
import * as fs from "fs";

// Node.js ortamında WebSocket desteği
neonConfig.webSocketConstructor = ws;

// ─── Konfigürasyon ────────────────────────────────────────────────────────────

// Scriptin hangi dizinden çalıştırıldığından bağımsız olarak
// proje kökündeki prisma/dev.db dosyasını bulur.
const SQLITE_PATH = path.join(process.cwd(), "dev.db");
const BATCH_SIZE  = 500;

if (!fs.existsSync(SQLITE_PATH)) {
  console.error(`\n❌  SQLite dosyası bulunamadı: ${SQLITE_PATH}`);
  console.error("    Scripti proje kök dizininden çalıştırdığından emin ol:\n");
  console.error("    cd /path/to/matchboxd && npm run db:migrate-neon\n");
  process.exit(1);
}

// ─── Neon client ──────────────────────────────────────────────────────────────

const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL! });
const neon    = new PrismaClient({ adapter, log: ["error"] });

// ─── Yardımcılar ──────────────────────────────────────────────────────────────

/** SQLite'ın sakladığı ISO string / number değerlerini Date'e çevirir */
function toDate(val: unknown): Date {
  if (!val) return new Date(0);
  if (typeof val === "number") return new Date(val);
  return new Date(String(val));
}

function chunk<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

async function runBatches<T>(
  label: string,
  rows: T[],
  insert: (batch: T[]) => Promise<unknown>
) {
  if (rows.length === 0) {
    console.log(`  ⏩  ${label}: kayıt yok, atlandı.`);
    return;
  }
  const batches = chunk(rows, BATCH_SIZE);
  let done = 0;
  for (const batch of batches) {
    await insert(batch);
    done += batch.length;
    process.stdout.write(`\r  ✦  ${label}: ${done}/${rows.length}`);
  }
  console.log(`\r  ✅  ${label}: ${done} kayıt aktarıldı.        `);
}

// ─── Ana fonksiyon ────────────────────────────────────────────────────────────

async function main() {
  const dbUrl = process.env.DATABASE_URL ?? "(prisma.config.ts'ten okunuyor)";
  console.log("\n🚀  Matchboxd → Neon migration başlıyor…");
  console.log(`   SQLite: ${SQLITE_PATH}`);
  console.log(`   Neon  : ${dbUrl.replace(/:([^@]+)@/, ":***@")}\n`);

  const db = new Database(SQLITE_PATH, { readonly: true });

  // ── 1. Users ─────────────────────────────────────────────────────────────
  const users = db.prepare("SELECT * FROM User").all() as Record<string, unknown>[];
  await runBatches("User", users, (batch) =>
    neon.user.createMany({
      data: batch.map((u) => ({
        id:           String(u.id),
        email:        String(u.email),
        name:         String(u.name),
        passwordHash: u.passwordHash ? String(u.passwordHash) : null,
        avatarUrl:    u.avatarUrl    ? String(u.avatarUrl)    : null,
        favoriteTeam: u.favoriteTeam ? String(u.favoriteTeam) : null,
        role:         String(u.role ?? "user"),
        createdAt:    toDate(u.createdAt),
        updatedAt:    toDate(u.updatedAt),
      })),
      skipDuplicates: true,
    })
  );

  // ── 2. Matches ────────────────────────────────────────────────────────────
  const matches = db.prepare("SELECT * FROM Match").all() as Record<string, unknown>[];
  await runBatches("Match", matches, (batch) =>
    neon.match.createMany({
      data: batch.map((m) => ({
        id:              String(m.id),
        externalId:      m.externalId ? String(m.externalId) : null,
        homeTeamName:    String(m.homeTeamName),
        awayTeamName:    String(m.awayTeamName),
        homeCrest:       m.homeCrest  ? String(m.homeCrest)  : null,
        awayCrest:       m.awayCrest  ? String(m.awayCrest)  : null,
        homeScore:       Number(m.homeScore),
        awayScore:       Number(m.awayScore),
        competition:     String(m.competition),
        competitionType: String(m.competitionType ?? "league"),
        season:          String(m.season),
        matchDate:       toDate(m.matchDate),
        venue:           String(m.venue ?? ""),
        status:          m.status    ? String(m.status)    : null,
        statsJson:       m.statsJson ? String(m.statsJson) : null,
        isArchived:      Boolean(m.isArchived),
        likeCount:       Number(m.likeCount ?? 0),
        createdAt:       toDate(m.createdAt),
        updatedAt:       toDate(m.updatedAt),
      })),
      skipDuplicates: true,
    })
  );

  // ── 3. Reviews ────────────────────────────────────────────────────────────
  const reviews = db.prepare("SELECT * FROM Review").all() as Record<string, unknown>[];
  await runBatches("Review", reviews, (batch) =>
    neon.review.createMany({
      data: batch.map((r) => ({
        id:                  String(r.id),
        matchId:             String(r.matchId),
        userId:              r.userId ? String(r.userId) : null,
        userName:            String(r.userName ?? ""),
        title:               r.title               ? String(r.title)               : null,
        content:             String(r.content ?? ""),
        rating:              Number(r.rating),
        formation:           r.formation           ? String(r.formation)           : null,
        manOfTheMatch:       r.manOfTheMatch        ? String(r.manOfTheMatch)       : null,
        categoryRatingsJson: r.categoryRatingsJson  ? String(r.categoryRatingsJson) : null,
        weightedRating:      r.weightedRating != null ? Number(r.weightedRating)   : null,
        likeCount:           Number(r.likeCount ?? 0),
        createdAt:           toDate(r.createdAt),
        updatedAt:           toDate(r.updatedAt),
      })),
      skipDuplicates: true,
    })
  );

  // ── 4. Collections ────────────────────────────────────────────────────────
  const collections = db.prepare("SELECT * FROM Collection").all() as Record<string, unknown>[];
  await runBatches("Collection", collections, (batch) =>
    neon.collection.createMany({
      data: batch.map((c) => ({
        id:          String(c.id),
        userId:      String(c.userId),
        name:        String(c.name),
        description: c.description ? String(c.description) : null,
        isPublic:    Boolean(c.isPublic ?? true),
        type:        String(c.type ?? "CUSTOM"),
        createdAt:   toDate(c.createdAt),
        updatedAt:   toDate(c.updatedAt),
      })),
      skipDuplicates: true,
    })
  );

  // ── 5. CollectionMatches ──────────────────────────────────────────────────
  const cm = db.prepare("SELECT * FROM CollectionMatch").all() as Record<string, unknown>[];
  await runBatches("CollectionMatch", cm, (batch) =>
    neon.collectionMatch.createMany({
      data: batch.map((x) => ({
        id:           String(x.id),
        collectionId: String(x.collectionId),
        matchId:      String(x.matchId),
        addedAt:      toDate(x.addedAt),
      })),
      skipDuplicates: true,
    })
  );

  db.close();
  await neon.$disconnect();

  console.log("\n🎉  Migration tamamlandı!\n");
}

main().catch((err) => {
  console.error("\n❌  Migration hatası:", err);
  process.exit(1);
});
