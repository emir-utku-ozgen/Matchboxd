/**
 * Football-Data.org API v4 entegrasyonu
 * https://www.football-data.org/documentation/quickstart
 *
 * API Key: .env dosyasına FOOTBALL_DATA_API_KEY=xxx ekleyin.
 * Ücretsiz key: https://www.football-data.org/client/register
 */

const API_BASE = "https://api.football-data.org/v4";

/** Ücretsiz planda genelde PL (Premier League) ve bazen TSL (Süper Lig) açık oluyor */
const DEFAULT_COMPETITIONS = ["PL", "TSL"];

export type FootballDataMatch = {
  id: number;
  utcDate: string;
  status: string;
  venue: string | null;
  homeTeam: { id: number; name: string; shortName: string; crest: string | null };
  awayTeam: { id: number; name: string; shortName: string; crest: string | null };
  score?: {
    fullTime?: { home: number | null; away: number | null };
    halfTime?: { home: number | null; away: number | null };
  };
  competition?: { id: number; name: string; code: string; type: string };
  season?: { startDate: string; endDate: string };
};

type MatchesResponse = {
  matches?: FootballDataMatch[];
  message?: string;
};

function getApiKey(): string | null {
  return process.env.FOOTBALL_DATA_API_KEY?.trim() || null;
}

export function isFootballDataConfigured(): boolean {
  return !!getApiKey();
}

/**
 * Bir lig için maçları çeker (geçmiş + gelecek birkaç hafta)
 */
async function fetchMatchesForCompetition(
  competitionCode: string,
  apiKey: string
): Promise<FootballDataMatch[]> {
  const url = `${API_BASE}/competitions/${competitionCode}/matches`;
  const res = await fetch(url, {
    headers: { "X-Auth-Token": apiKey },
    next: { revalidate: 0 },
  });

  if (!res.ok) {
    if (res.status === 403) {
      console.warn(`[Football-Data] Lig ${competitionCode} bu planla kullanılamıyor olabilir.`);
      return [];
    }
    throw new Error(`Football-Data API: ${res.status} ${res.statusText}`);
  }

  const data = (await res.json()) as MatchesResponse;
  if (data.message) throw new Error(data.message);
  return data.matches ?? [];
}

/**
 * Tüm yapılandırılmış liglerden maçları çeker
 */
export async function fetchMatchesFromApi(): Promise<FootballDataMatch[]> {
  const apiKey = getApiKey();
  if (!apiKey) return [];

  const competitions =
    process.env.FOOTBALL_DATA_COMPETITIONS?.split(",").map((c) => c.trim()) ||
    DEFAULT_COMPETITIONS;

  const all: FootballDataMatch[] = [];
  for (const code of competitions) {
    try {
      const matches = await fetchMatchesForCompetition(code, apiKey);
      all.push(...matches);
    } catch (e) {
      console.warn(`[Football-Data] ${code} maçları alınamadı:`, e);
    }
  }

  return all;
}

/**
 * API maçını bizim Match modeline dönüştürür
 */
export function mapApiMatchToDb(m: FootballDataMatch) {
  const homeScore = m.score?.fullTime?.home ?? 0;
  const awayScore = m.score?.fullTime?.away ?? 0;
  const competitionName = m.competition?.name ?? "Bilinmeyen Lig";
  const seasonStart = m.season?.startDate ?? new Date().toISOString().slice(0, 4);
  const season = `${seasonStart}-${Number(seasonStart) + 1}`;

  return {
    externalId: String(m.id),
    homeTeamName: m.homeTeam.name,
    awayTeamName: m.awayTeam.name,
    homeCrest: m.homeTeam.crest || null,
    awayCrest: m.awayTeam.crest || null,
    homeScore: typeof homeScore === "number" ? homeScore : 0,
    awayScore: typeof awayScore === "number" ? awayScore : 0,
    competition: competitionName,
    competitionType: (m.competition?.type ?? "LEAGUE").toLowerCase(),
    season,
    matchDate: new Date(m.utcDate),
    venue: m.venue || "—",
    status: m.status || null,
  };
}
