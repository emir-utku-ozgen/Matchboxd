/**
 * prisma/archive.ts
 *
 * openfootball/football.json reposundan 2010-11 → 2025-26 sezonlarını çekerek
 * Prisma Match tablosuna arşivler (isArchived: true).
 *
 * Çalıştırmak için:  npm run db:archive
 * Node 18+'de native fetch mevcut olduğundan node-fetch gerekmez.
 */

import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";

// ─────────────────────────────────────────────────────────────────────────────
// CONFIGURATION
// ─────────────────────────────────────────────────────────────────────────────

const START_YEAR = 2010;   // 2010-11 sezonu
const END_YEAR   = 2025;   // 2025-26 sezonu (yok ise 404 ile atlanır)
const DELAY_MS   = 700;    // GitHub RAW rate-limit için bekleme süresi
const CHUNK_SIZE = 500;    // Toplu yazma parça boyutu

/** Arşivlenecek ligler: [dosya kodu, lig adı, ülke] */
const LEAGUES: Array<{ code: string; name: string; country: string }> = [
  { code: "en.1", name: "Premier League",  country: "England" },
  { code: "es.1", name: "La Liga",         country: "Spain"   },
  { code: "it.1", name: "Serie A",         country: "Italy"   },
  { code: "de.1", name: "Bundesliga",      country: "Germany" },
  { code: "fr.1", name: "Ligue 1",         country: "France"  },
];

// ─────────────────────────────────────────────────────────────────────────────
// OPENFOOTBALL JSON TYPES
// Tüm sezonlarda yapı: { name, matches: [...] }
// Her maçta: round?, date, time?, team1, team2, score: { ft?, ht? }
// ─────────────────────────────────────────────────────────────────────────────

interface OFBScore  { ft?: [number, number]; ht?: [number, number]; et?: [number, number] }
interface OFBMatch  { round?: string; date: string; time?: string; team1: string; team2: string; score?: OFBScore }
interface OFBLeague { name: string; matches: OFBMatch[] }

// ─────────────────────────────────────────────────────────────────────────────
// TACTICAL FORMATION LOOKUP
// ─────────────────────────────────────────────────────────────────────────────

const FALLBACK_FORMATIONS = [
  "4-3-3", "4-2-3-1", "4-4-2", "3-5-2", "4-1-4-1", "5-3-2", "4-3-2-1",
];

/**
 * Takım adı + sezon yılına göre taktiksel dizilişi döner.
 * Dönemin ikonik takımları için tarihsel gerçekçilik esas alınır.
 */
function getTacticalFormation(teamName: string, season: string): string {
  const t   = normalizeTeam(teamName);
  const yr  = parseInt(season.split("-")[0], 10); // örn. 2023

  // ── Premier League ──────────────────────────────────────────────────────
  if (includes(t, "arsenal")) {
    if (yr >= 2023) return "4-3-3";       // Arteta modern yüksek baskı
    if (yr >= 2019) return "4-2-3-1";
    return "4-4-2";                        // Wenger klasik dönemi
  }
  if (includes(t, "chelsea")) {
    if (yr >= 2022) return "3-4-3";
    if (yr >= 2019) return "3-5-2";        // Tuchel / Conte
    return "4-3-3";
  }
  if (includes(t, "liverpool")) {
    if (yr >= 2015) return "4-3-3";        // Klopp gegenpressing
    return "4-4-2";
  }
  if (includes(t, "manchester city") || includes(t, "man. city") || t === "man city") {
    if (yr >= 2016) return "4-3-3";        // Guardiola
    return "4-2-3-1";                      // Mancini / Pellegrini
  }
  if (includes(t, "manchester utd") || includes(t, "manchester united") || t === "man united") {
    if (yr >= 2021) return "4-2-3-1";
    if (yr >= 2016) return "4-3-3";        // Mourinho / Solskjaer
    return "4-4-2";                        // Ferguson son yılları
  }
  if (includes(t, "tottenham") || includes(t, "spurs")) {
    if (yr >= 2016) return "4-2-3-1";
    return "4-4-2";
  }
  if (includes(t, "leicester")) {
    if (yr === 2015 || yr === 2016) return "4-4-2"; // Şampiyonluk sezonu
    return "4-2-3-1";
  }

  // ── La Liga ─────────────────────────────────────────────────────────────
  if (includes(t, "barcelona") || includes(t, "fc barcelona")) {
    if (yr >= 2008 && yr <= 2012) return "4-3-3"; // Guardiola tiki-taka
    if (yr >= 2013 && yr <= 2016) return "4-3-3"; // MSN üçlüsü
    if (yr >= 2023) return "4-3-3";               // Xavi
    return "4-3-3";
  }
  if (includes(t, "real madrid")) {
    if (yr >= 2021) return "4-3-3";
    if (yr >= 2013) return "4-3-3";               // Ancelotti / Zidane dönemleri
    return "4-2-3-1";
  }
  if (includes(t, "atletico") && includes(t, "madrid")) {
    return "4-4-2";                                // Simeone blok savunma
  }
  if (includes(t, "sevilla")) return "4-2-3-1";
  if (includes(t, "villarreal")) return "4-3-3";
  if (includes(t, "real sociedad")) return "4-3-3";

  // ── Bundesliga ──────────────────────────────────────────────────────────
  if ((includes(t, "bayern") && includes(t, "münchen")) || t === "fc bayern münchen" || t === "fc bayern munich" || t === "bayern münchen" || t === "fc bayern") {
    if (yr >= 2019) return "4-2-3-1";             // Flick / Tuchel
    if (yr >= 2012) return "4-3-3";               // Heynckes / Guardiola
    return "4-2-3-1";
  }
  if (includes(t, "borussia dortmund") || t === "bvb") {
    if (yr >= 2018) return "4-2-3-1";
    return "4-3-3";                                // Klopp 2010-15
  }
  if (includes(t, "rb leipzig")) return "4-3-3";
  if (includes(t, "bayer leverkusen")) return "3-4-3";
  if (includes(t, "eintracht frankfurt")) return "3-4-3";

  // ── Serie A ─────────────────────────────────────────────────────────────
  if (includes(t, "juventus")) {
    if (yr >= 2021) return "3-5-2";
    return "4-3-3";                                // Allegri / Sarri dönemleri
  }
  if (includes(t, "inter")) {
    if (yr >= 2019) return "3-5-2";               // Conte / Inzaghi
    return "4-2-3-1";
  }
  if (t === "ac milan" || t === "milan") {
    if (yr >= 2021) return "4-2-3-1";
    return "4-3-3";
  }
  if (includes(t, "napoli")) {
    if (yr >= 2022) return "4-3-3";               // Spalletti şampiyonluk
    return "4-2-3-1";
  }
  if (includes(t, "as roma") || t === "roma") return "3-5-2";
  if (includes(t, "lazio")) return "4-3-3";
  if (includes(t, "atalanta")) return "3-4-2-1";  // Gasperini

  // ── Ligue 1 ─────────────────────────────────────────────────────────────
  if (includes(t, "paris") || t === "paris sg" || t === "psg") {
    if (yr >= 2017) return "4-3-3";               // Neymar / Mbappé dönemleri
    return "4-4-2";
  }
  if (includes(t, "olympique de marseille") || t === "olympique marseille") return "4-2-3-1";
  if (includes(t, "olympique lyonnais") || includes(t, "lyon")) return "4-3-3";
  if (includes(t, "monaco")) {
    if (yr === 2016 || yr === 2017) return "4-4-2"; // Mbappé-Falcao dönemi
    return "4-3-3";
  }
  if (includes(t, "stade rennais") || t === "rennes") return "4-3-3";
  if (includes(t, "lille")) return "4-4-2";

  // Tanımsız takım: rastgele diziliş
  return FALLBACK_FORMATIONS[Math.floor(Math.random() * FALLBACK_FORMATIONS.length)];
}

function includes(source: string, term: string): boolean {
  return source.includes(term);
}

/** "Arsenal FC" → "Arsenal", "Atlético Madrid CF" → "atlético madrid cf" */
function normalizeTeam(name: string): string {
  return name
    .toLowerCase()
    .replace(/\s+(fc|afc|cf|sc|ac|united|city|hotspur)$/i, "")
    .trim();
}

// ─────────────────────────────────────────────────────────────────────────────
// DATE PARSING
// Openfootball eski sezonlarda "Aug 11" (kısa ay adı), yeni sezonlarda
// "2023-08-11" (ISO) formatı kullanır.
// ─────────────────────────────────────────────────────────────────────────────

const MONTH_ABBR: Record<string, number> = {
  Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5,
  Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11,
};

function parseMatchDate(dateStr: string, season: string): Date {
  // ISO format: "2023-08-11"
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return new Date(dateStr + "T12:00:00Z");
  }
  // Short format: "Aug 11" ya da "Nov 2"
  const parts = dateStr.trim().split(/\s+/);
  if (parts.length === 2) {
    const monthIdx = MONTH_ABBR[parts[0]];
    if (monthIdx === undefined) return new Date();
    const day      = parseInt(parts[1], 10);
    const baseYear = parseInt(season.split("-")[0], 10);
    // Ağustos-Aralık → sezon başlangıç yılı; Ocak-Temmuz → sezon bitiş yılı
    const year = monthIdx >= 7 ? baseYear : baseYear + 1;
    return new Date(Date.UTC(year, monthIdx, day, 12, 0, 0));
  }
  return new Date();
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

function slugify(str: string): string {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

/** 2010-11 … 2025-26 sezon listesi */
function generateSeasons(from: number, to: number): string[] {
  const list: string[] = [];
  for (let y = from; y <= to; y++) {
    const end = String(y + 1).slice(-2);
    list.push(`${y}-${end}`);
  }
  return list;
}

/** Diziyi n boyutlu parçalara böler */
function chunk<T>(arr: T[], n: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n));
  return out;
}

// ─────────────────────────────────────────────────────────────────────────────
// FETCH
// ─────────────────────────────────────────────────────────────────────────────

const BASE_URL =
  "https://raw.githubusercontent.com/openfootball/football.json/master";

async function fetchLeagueData(
  season: string,
  leagueCode: string
): Promise<OFBLeague | null> {
  const url = `${BASE_URL}/${season}/${leagueCode}.json`;
  const res = await fetch(url);
  if (res.status === 404) {
    console.log(`  ↳ Bulunamadı (404): ${season}/${leagueCode}.json`);
    return null;
  }
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} — ${url}`);
  }
  return (await res.json()) as OFBLeague;
}

// ─────────────────────────────────────────────────────────────────────────────
// PARSE → Prisma input rows
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

function parseLeagueMatches(
  data: OFBLeague,
  season: string,
  leagueCode: string,
  leagueName: string
): MatchRow[] {
  const rows: MatchRow[] = [];

  // openfootball tüm sürümlerinde düz matches[] dizisi kullanılır
  for (const m of data.matches ?? []) {
    // Sadece tamamlanmış maçları al (ft skoru varsa)
    const ft = m.score?.ft;
    if (!ft || ft.length !== 2) continue;

    const homeFormation = getTacticalFormation(m.team1, season);
    const awayFormation = getTacticalFormation(m.team2, season);
    const matchDate     = parseMatchDate(m.date, season);

    // externalId: ofb_en1_2023-24_arsenal-fc_vs_nottingham-forest-fc_2023-08-11
    const externalId = `ofb_${leagueCode.replace(".", "")}_${season}_${slugify(m.team1)}_vs_${slugify(m.team2)}_${m.date}`;

    rows.push({
      externalId,
      homeTeamName:    m.team1,
      awayTeamName:    m.team2,
      homeScore:       ft[0],
      awayScore:       ft[1],
      competition:     leagueName,
      competitionType: "league",
      season,
      matchDate,
      venue:           "—",
      status:          "FINISHED",
      statsJson:       JSON.stringify({ homeFormation, awayFormation, round: m.round ?? "" }),
      isArchived:      true,
    });
  }

  return rows;
}

// ─────────────────────────────────────────────────────────────────────────────
// PRISMA SETUP
// ─────────────────────────────────────────────────────────────────────────────

function createPrisma(): PrismaClient {
  const url       = process.env.DATABASE_URL ?? "file:./dev.db";
  const authToken = process.env.DATABASE_AUTH_TOKEN ?? process.env.TURSO_AUTH_TOKEN;

  const adapter = new PrismaLibSql({ url, authToken: authToken || undefined });
  return new PrismaClient({ adapter });
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────────────────────────

async function main() {
  const startTime = Date.now();
  const prisma    = createPrisma();

  const seasons = generateSeasons(START_YEAR, END_YEAR);
  console.log(`\n📅  ${seasons.length} sezon × ${LEAGUES.length} lig = en fazla ${seasons.length * LEAGUES.length} istek`);
  console.log(`⏱   İstekler arası bekleme: ${DELAY_MS}ms\n`);

  let totalArchived  = 0;
  let totalSkipped   = 0;
  let totalFetched   = 0;
  const pendingRows: MatchRow[] = [];

  /**
   * Bellekte biriken satırları 500'erli chunk'larla DB'ye yazar.
   * Önce mevcut externalId'leri sorgular, yalnızca yenileri createMany ile yazar.
   * LibSQL/SQLite'da skipDuplicates desteklenmediği için bu yöntem kullanılır.
   */
  async function flushBuffer(force = false) {
    while (pendingRows.length >= CHUNK_SIZE || (force && pendingRows.length > 0)) {
      const batch = pendingRows.splice(0, Math.min(CHUNK_SIZE, pendingRows.length));

      // Mevcut externalId'leri sorgula
      const existingIds = new Set(
        (await prisma.match.findMany({
          where:  { externalId: { in: batch.map((r) => r.externalId) } },
          select: { externalId: true },
        })).map((r) => r.externalId)
      );

      const newRows = batch.filter((r) => !existingIds.has(r.externalId));
      const skipped = batch.length - newRows.length;
      totalSkipped += skipped;

      if (newRows.length === 0) {
        if (skipped > 0)
          console.log(`  ↷  ${skipped} maç zaten mevcut, atlandı`);
        continue;
      }

      try {
        const result = await prisma.match.createMany({ data: newRows });
        totalArchived += result.count;
        console.log(
          `  ✔  ${result.count} maç arşivlendi` +
          (skipped > 0 ? ` (${skipped} zaten vardı)` : "")
        );
      } catch (err) {
        // Nadir durumlar için fallback: tek tek upsert
        const msg = err instanceof Error ? err.message : String(err);
        console.warn(`  ⚠  createMany başarısız (${msg}), upsert moduna geçiliyor…`);
        for (const row of newRows) {
          try {
            await prisma.match.upsert({
              where:  { externalId: row.externalId },
              create: row,
              update: {},
            });
            totalArchived++;
          } catch {
            // tamamen atla
          }
        }
      }
    }
  }

  for (const season of seasons) {
    console.log(`\n══ Sezon: ${season} ══════════════════════════════════`);

    for (const league of LEAGUES) {
      try {
        const data = await fetchLeagueData(season, league.code);
        if (!data) continue;

        const rows = parseLeagueMatches(data, season, league.code, league.name);
        console.log(`  📥  ${league.name.padEnd(16)} → ${rows.length} maç parse edildi`);
        totalFetched += rows.length;
        pendingRows.push(...rows);

        await flushBuffer();
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.warn(`  ✖  ${league.name} (${season}) HATA: ${msg}`);
      }

      // Rate limit koruması: her dosya çekimi arasında bekle
      await sleep(DELAY_MS);
    }
  }

  // Kalan satırları temizle
  await flushBuffer(true);

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

  console.log(`
╔══════════════════════════════════════════════════╗
║              ARŞİVLEME TAMAMLANDI                ║
╠══════════════════════════════════════════════════╣
║  Parse edilen maç toplam : ${String(totalFetched).padStart(8)}                ║
║  Yeni arşivlenen         : ${String(totalArchived).padStart(8)}                ║
║  Zaten mevcut (atlandı)  : ${String(totalSkipped).padStart(8)}                ║
║  Toplam süre             : ${String(elapsed + "s").padStart(8)}                ║
╚══════════════════════════════════════════════════╝
`);

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error("❌ Arşivleme başarısız:", e);
  process.exit(1);
});
