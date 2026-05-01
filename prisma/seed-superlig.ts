/**
 * prisma/seed-superlig.ts
 *
 * openfootball/football.json → tr.1.json dosyalarından Süper Lig verilerini
 * 2010-11'den 2025-26'ya kadar tarar ve Match tablosuna arşivler.
 *
 * Çalıştırmak için:  npm run db:superlig
 *
 * NOT: LibSQL adapter'ı createMany + skipDuplicates desteklemediğinden,
 * önce DB'deki mevcut externalId'ler sorgulanır, sadece yeni kayıtlar yazılır.
 */

import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";

// ─────────────────────────────────────────────────────────────────────────────
// CONFIG
// ─────────────────────────────────────────────────────────────────────────────

const START_YEAR = 2010;
const END_YEAR   = 2025;
const DELAY_MS   = 700;   // GitHub RAW rate-limit koruması
const CHUNK_SIZE = 500;

const BASE_URL =
  "https://raw.githubusercontent.com/openfootball/football.json/master";

// ─────────────────────────────────────────────────────────────────────────────
// OPENFOOTBALL TYPES
// ─────────────────────────────────────────────────────────────────────────────

interface OFBScore  { ft?: [number, number]; ht?: [number, number] }
interface OFBMatch  { round?: string; date: string; time?: string; team1: string; team2: string; score?: OFBScore }
interface OFBLeague { name: string; matches: OFBMatch[] }

// ─────────────────────────────────────────────────────────────────────────────
// TURKISH TEAM FORMATIONS  (antrenör dönemine göre)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Türk futbolunun büyük kulüplerine antrenör dönemlerini baz alarak
 * taktiksel diziliş atar.
 */
function getSuperLigFormation(teamName: string, season: string): string {
  const t   = turkishLower(teamName);
  const yr  = parseInt(season.split("-")[0], 10);

  // ── Galatasaray ──────────────────────────────────────────────────────────
  if (t === "galatasaray") {
    // Fatih Terim 1. dönemi: 2010-13 → 4-4-2
    if (yr >= 2010 && yr <= 2012) return "4-4-2";
    // Tudor / Hamzaoğlu: 2013-16 → 4-2-3-1
    if (yr >= 2013 && yr <= 2015) return "4-2-3-1";
    // Riekerink: 2016-17 → 4-3-3
    if (yr === 2016) return "4-3-3";
    // Fatih Terim 2. dönemi: 2017-18 → 4-2-3-1
    if (yr === 2017) return "4-2-3-1";
    // Aslan Karalı dönem: 2018-19 → 4-1-4-1
    if (yr === 2018) return "4-1-4-1";
    // Fatih Terim 3. dönemi: 2019-22 → 4-2-3-1
    if (yr >= 2019 && yr <= 2021) return "4-2-3-1";
    // Okan Buruk: 2022-günümüz → 4-2-3-1
    return "4-2-3-1";
  }

  // ── Fenerbahçe ───────────────────────────────────────────────────────────
  if (t === "fenerbahçe" || t === "fenerbahce") {
    // Aykut Kocaman: 2010-13 → 4-2-3-1
    if (yr >= 2010 && yr <= 2012) return "4-2-3-1";
    // Ersun Yanal 1.: 2013-14 → 4-2-3-1
    if (yr === 2013) return "4-2-3-1";
    // Vitor Pereira: 2014-15 → 4-3-3
    if (yr === 2014) return "4-3-3";
    // Aykut Kocaman 2.: 2017-18 → 4-2-3-1
    if (yr >= 2016 && yr <= 2017) return "4-2-3-1";
    // Ersun Yanal 2.: 2018-19 → 4-2-3-1
    if (yr === 2018) return "4-2-3-1";
    // Erol Bulut / Vitor Pereira: 2019-22 → 4-3-3
    if (yr >= 2019 && yr <= 2021) return "4-3-3";
    // İsmail Kartal: 2022-23 → 4-2-3-1
    if (yr === 2022) return "4-2-3-1";
    // Jorge Jesus: 2023-24 → 3-4-3
    if (yr === 2023) return "3-4-3";
    // José Mourinho: 2024-25 → 4-2-3-1
    return "4-2-3-1";
  }

  // ── Beşiktaş ─────────────────────────────────────────────────────────────
  if (t === "beşiktaş" || t === "besiktas" || t === "beşiktaş jk" || t === "besiktas jk") {
    // Slaven Bilić: 2013-15 → 4-2-3-1
    if (yr >= 2013 && yr <= 2014) return "4-2-3-1";
    // Şenol Güneş 1.: 2015-17 → 3-5-2
    if (yr >= 2015 && yr <= 2016) return "3-5-2";
    // Güneş / Karaman: 2017-20 → 3-4-3
    if (yr >= 2017 && yr <= 2019) return "3-4-3";
    // Sergen Yalçın: 2020-22 → 4-1-4-1
    if (yr === 2020 || yr === 2021) return "4-1-4-1";
    // Valerien Ismael: 2022-23 → 4-3-3
    if (yr === 2022) return "4-3-3";
    // Şenol Güneş 2. / Santos: 2023-24 → 4-2-3-1
    return "4-2-3-1";
  }

  // ── Trabzonspor ──────────────────────────────────────────────────────────
  if (t === "trabzonspor") {
    // Şota Arveladze: 2011-13 → 4-2-3-1
    if (yr >= 2011 && yr <= 2012) return "4-2-3-1";
    // Abdullah Avcı: 2020-24 → 4-3-3
    if (yr >= 2020 && yr <= 2023) return "4-3-3";
    return "4-2-3-1";
  }

  // ── Başakşehir ───────────────────────────────────────────────────────────
  if (t.includes("başakşehir") || t.includes("basaksehir") || t.includes("istanbul bb")) {
    // Okan Buruk (Başakşehir'de): 2018-21 → 4-1-4-1
    if (yr >= 2018 && yr <= 2020) return "4-1-4-1";
    // Emre Belözoğlu: 2021-23 → 4-3-3
    return "4-3-3";
  }

  // ── Bursaspor ────────────────────────────────────────────────────────────
  if (t.includes("bursaspor")) {
    // Şenol Güneş / Paul Le Guen: 2010-12 → 4-4-2
    if (yr <= 2012) return "4-4-2";
    return "4-2-3-1";
  }

  // ── Sivasspor ────────────────────────────────────────────────────────────
  if (t.includes("sivasspor") || t.includes("sivas")) return "4-4-2";

  // ── Diğer Süper Lig takımları ─────────────────────────────────────────────
  const others: Record<string, string> = {
    "kasımpaşa":   "4-2-3-1",
    "kasımpaşa sk":"4-2-3-1",
    "antalyaspor": "4-4-2",
    "konyaspor":   "4-2-3-1",
    "alanyaspor":  "4-3-3",
    "kayserispor": "4-4-2",
    "gaziantepspor":"4-4-2",
    "gaziantep fk":"4-4-2",
    "mersin":      "4-4-2",
    "eskişehirspor":"4-4-2",
    "elazığspor":  "4-4-2",
    "akhisar":     "4-2-3-1",
    "akhisarspor": "4-2-3-1",
    "osmanlıspor": "4-1-4-1",
    "osmanlispor": "4-1-4-1",
    "rizespor":    "4-4-2",
    "çaykur rizespor": "4-4-2",
    "caykur rizespor": "4-4-2",
    "yeni malatyaspor": "4-2-3-1",
    "hatayspor":   "4-3-3",
    "göztepe":     "4-2-3-1",
    "goztepe":     "4-2-3-1",
    "adana demirspor": "4-3-3",
    "giresunspor": "5-3-2",
    "karagümrük":  "4-3-3",
    "fa karagümrük":"4-3-3",
    "fa karagumruk":"4-3-3",
    "ankaragücü":  "4-4-2",
    "ankaragucu":  "4-4-2",
    "samsunspor":  "4-4-2",
    "boluspor":    "4-4-2",
    "bodrum fk":   "4-3-3",
    "eyüpspor":    "4-2-3-1",
  };

  const found = Object.keys(others).find((k) => t.includes(k));
  if (found) return others[found];

  // Tanımsız → rastgele
  const fallbacks = ["4-3-3", "4-2-3-1", "4-4-2", "3-5-2", "4-1-4-1"];
  return fallbacks[Math.floor(Math.random() * fallbacks.length)];
}

/** Türkçe karakterleri koruyarak küçük harfe çevirir */
function turkishLower(str: string): string {
  return str
    .replace(/İ/g, "i")
    .replace(/I/g, "ı")
    .toLowerCase();
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

function slugify(str: string): string {
  return str
    .replace(/İ/g, "i").replace(/I/g, "i")
    .replace(/Ğ/g, "g").replace(/Ş/g, "s").replace(/Ç/g, "c")
    .replace(/Ö/g, "o").replace(/Ü/g, "u")
    .toLowerCase()
    .replace(/ğ/g, "g").replace(/ş/g, "s").replace(/ç/g, "c")
    .replace(/ö/g, "o").replace(/ü/g, "u").replace(/ı/g, "i")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function generateSeasons(from: number, to: number): string[] {
  const seasons: string[] = [];
  for (let y = from; y <= to; y++) {
    const end = String(y + 1).slice(-2);
    seasons.push(`${y}-${end}`);
  }
  return seasons;
}

function chunk<T>(arr: T[], n: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n));
  return out;
}

const MONTH_ABBR: Record<string, number> = {
  Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5,
  Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11,
};

function parseDate(dateStr: string, season: string): Date {
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr))
    return new Date(dateStr + "T12:00:00Z");

  const parts = dateStr.trim().split(/\s+/);
  if (parts.length === 2) {
    const monthIdx = MONTH_ABBR[parts[0]];
    if (monthIdx === undefined) return new Date();
    const day      = parseInt(parts[1], 10);
    const baseYear = parseInt(season.split("-")[0], 10);
    const year     = monthIdx >= 7 ? baseYear : baseYear + 1;
    return new Date(Date.UTC(year, monthIdx, day, 12, 0, 0));
  }
  return new Date();
}

// ─────────────────────────────────────────────────────────────────────────────
// FETCH
// ─────────────────────────────────────────────────────────────────────────────

async function fetchSeason(season: string): Promise<OFBLeague | null> {
  const url = `${BASE_URL}/${season}/tr.1.json`;
  const res = await fetch(url);
  if (res.status === 404) {
    console.log(`  ↳ Bulunamadı (404): ${season}/tr.1.json`);
    return null;
  }
  if (!res.ok) throw new Error(`HTTP ${res.status} → ${url}`);
  return (await res.json()) as OFBLeague;
}

// ─────────────────────────────────────────────────────────────────────────────
// PARSE
// ─────────────────────────────────────────────────────────────────────────────

interface MatchRow {
  externalId:      string;
  homeTeamName:    string;
  awayTeamName:    string;
  homeScore:       number;
  awayScore:       number;
  competition:     string;
  competitionType: string;
  season:          string;
  matchDate:       Date;
  venue:           string;
  status:          string;
  statsJson:       string;
  isArchived:      boolean;
}

function parseMatches(data: OFBLeague, season: string): MatchRow[] {
  const rows: MatchRow[] = [];

  for (const m of data.matches ?? []) {
    const ft = m.score?.ft;
    if (!ft || ft.length !== 2) continue; // Sadece tamamlanmış maçlar

    const homeFormation = getSuperLigFormation(m.team1, season);
    const awayFormation = getSuperLigFormation(m.team2, season);
    const matchDate     = parseDate(m.date, season);

    // externalId formatı: ofb_tr1_2024-25_galatasaray_vs_hatayspor_2024-08-09
    const externalId = `ofb_tr1_${season}_${slugify(m.team1)}_vs_${slugify(m.team2)}_${m.date}`;

    rows.push({
      externalId,
      homeTeamName:    m.team1,
      awayTeamName:    m.team2,
      homeScore:       ft[0],
      awayScore:       ft[1],
      competition:     "Süper Lig",
      competitionType: "league",
      season,
      matchDate,
      venue:           "—",
      status:          "FINISHED",
      statsJson:       JSON.stringify({
        homeFormation,
        awayFormation,
        round:  m.round ?? "",
        source: "openfootball/tr.1.json",
      }),
      isArchived: true,
    });
  }

  return rows;
}

// ─────────────────────────────────────────────────────────────────────────────
// DB
// ─────────────────────────────────────────────────────────────────────────────

function createPrisma(): PrismaClient {
  const url       = process.env.DATABASE_URL ?? "file:./dev.db";
  const authToken = process.env.DATABASE_AUTH_TOKEN ?? process.env.TURSO_AUTH_TOKEN;
  const adapter   = new PrismaLibSql({ url, authToken: authToken || undefined });
  return new PrismaClient({ adapter });
}

/**
 * Mevcut externalId'leri sorgulayıp sadece yenileri ekler.
 * (LibSQL createMany + skipDuplicates desteği olmadığından bu yöntem güvenli.)
 */
async function saveChunk(
  prisma: PrismaClient,
  rows: MatchRow[]
): Promise<number> {
  // Hangi externalId'ler zaten DB'de var?
  const existingSet = new Set(
    (
      await prisma.match.findMany({
        where:  { externalId: { in: rows.map((r) => r.externalId) } },
        select: { externalId: true },
      })
    ).map((r) => r.externalId)
  );

  const newRows = rows.filter((r) => !existingSet.has(r.externalId));
  if (newRows.length === 0) return 0;

  try {
    const result = await prisma.match.createMany({ data: newRows });
    return result.count;
  } catch (err) {
    // Fallback: tek tek upsert
    const msg = err instanceof Error ? err.message : String(err);
    console.warn(`  ⚠  createMany başarısız (${msg}), upsert moduna geçiliyor…`);
    let count = 0;
    for (const row of newRows) {
      try {
        await prisma.match.upsert({
          where:  { externalId: row.externalId },
          create: row,
          update: {},
        });
        count++;
      } catch {
        // atla
      }
    }
    return count;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────────────────────────

async function main() {
  const startTime = Date.now();
  const prisma    = createPrisma();

  const seasons = generateSeasons(START_YEAR, END_YEAR);
  console.log(`\n🇹🇷  Süper Lig Arşivleyici`);
  console.log(`📅  ${seasons.length} sezon taranacak (${seasons[0]} → ${seasons.at(-1)!})`);
  console.log(`⏱   İstekler arası bekleme: ${DELAY_MS}ms\n`);

  let totalAdded    = 0;
  let totalSkipped  = 0;
  let totalFetched  = 0;
  let seasonsFound  = 0;

  for (const season of seasons) {
    try {
      const data = await fetchSeason(season);

      if (!data) {
        // 404 – bu sezon openfootball'da yok, sessizce devam et
        await sleep(DELAY_MS);
        continue;
      }

      seasonsFound++;
      const rows = parseMatches(data, season);
      totalFetched += rows.length;
      console.log(`  ✅  ${season} → ${rows.length} tamamlanmış maç bulundu`);

      // 500'erli chunk'larla yaz
      for (const batch of chunk(rows, CHUNK_SIZE)) {
        const added   = await saveChunk(prisma, batch);
        const skipped = batch.length - added;
        totalAdded   += added;
        totalSkipped += skipped;

        if (added > 0)
          console.log(
            `        📝  ${added} maç eklendi` +
            (skipped > 0 ? ` (${skipped} zaten vardı)` : "")
          );
        else
          console.log(`        ↷   ${skipped} maç zaten mevcut, atlandı`);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn(`  ✖  ${season} HATA: ${msg}`);
    }

    await sleep(DELAY_MS);
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

  console.log(`
╔══════════════════════════════════════════════════════╗
║       SÜPER LİG ARŞİVİ TAMAMLANDI                   ║
╠══════════════════════════════════════════════════════╣
║  Bulunan sezon sayısı  : ${String(seasonsFound).padStart(6)}                    ║
║  Parse edilen maç      : ${String(totalFetched).padStart(6)}                    ║
║  Yeni eklenen          : ${String(totalAdded).padStart(6)}                    ║
║  Zaten mevcut (atlandı): ${String(totalSkipped).padStart(6)}                    ║
║  Toplam süre           : ${String(elapsed + "s").padStart(6)}                    ║
╚══════════════════════════════════════════════════════╝
`);

  console.log(`Süper Lig Arşivi tamamlandı: ${totalAdded} maç eklendi`);

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error("❌ Süper Lig arşivleme başarısız:", e);
  process.exit(1);
});
