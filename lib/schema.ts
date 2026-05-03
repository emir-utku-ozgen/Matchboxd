/**
 * Matchboxd - Futbol Müsabakaları Değerlendirme Sistemi
 * Domain tipleri: User, Match, Review, Collection, Stats
 */

export type UserRole = "user" | "editor" | "admin";

export interface User {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string;
  favoriteTeam?: string;
  role: UserRole;
  createdAt: Date;
  updatedAt: Date;
}

export type CompetitionType = "league" | "cup" | "international" | "friendly";

export interface Match {
  id: string;
  externalId?: string;
  homeTeamName: string;
  awayTeamName: string;
  homeCrest?: string;
  awayCrest?: string;
  homeScore: number;
  awayScore: number;
  competition: string;
  competitionType: CompetitionType;
  season: string;
  matchDate: Date;
  venue: string;
  status?: string;
  stats?: MatchStats;
  /** Maç kartı beğenileri (sunucuda varsayılan 0) */
  likeCount?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface MatchStats {
  possessionHome: number;
  possessionAway: number;
  shotsHome: number;
  shotsAway: number;
  shotsOnTargetHome: number;
  shotsOnTargetAway: number;
  cornersHome: number;
  cornersAway: number;
  foulsHome: number;
  foulsAway: number;
  yellowCardsHome: number;
  yellowCardsAway: number;
  redCardsHome: number;
  redCardsAway: number;
  passesHome?: number;
  passesAway?: number;
  passAccuracyHome?: number;
  passAccuracyAway?: number;
}

/**
 * Alt kategori puanları — her biri 1-10 arasında.
 * Ağırlıklı ortalama: tacticalLevel(%30) + excitement(%25) + tempo(%20) + atmosphere(%15) + referee(%10)
 */
export interface CategoryRatings {
  tempo: number;        // Oyun temposu
  tacticalLevel: number; // Taktiksel derinlik
  excitement: number;  // Heyecan seviyesi
  referee: number;     // Hakem performansı
  atmosphere: number;  // Atmosfer / tribün
}

export const CATEGORY_WEIGHTS: Record<keyof CategoryRatings, number> = {
  tacticalLevel: 0.30,
  excitement:    0.25,
  tempo:         0.20,
  atmosphere:    0.15,
  referee:       0.10,
};

export const CATEGORY_LABELS: Record<keyof CategoryRatings, string> = {
  tacticalLevel: "Taktiksel Seviye",
  excitement:    "Heyecan",
  tempo:         "Tempo",
  atmosphere:    "Atmosfer",
  referee:       "Hakem",
};

/** Ağırlıklı ortalama hesaplar (1-10 arası döner) */
export function computeWeightedRating(ratings: CategoryRatings): number {
  return (
    ratings.tacticalLevel * CATEGORY_WEIGHTS.tacticalLevel +
    ratings.excitement    * CATEGORY_WEIGHTS.excitement    +
    ratings.tempo         * CATEGORY_WEIGHTS.tempo         +
    ratings.atmosphere    * CATEGORY_WEIGHTS.atmosphere    +
    ratings.referee       * CATEGORY_WEIGHTS.referee
  );
}

export interface Review {
  id: string;
  matchId: string;
  userId?: string;
  userName: string;
  title?: string;
  content: string;
  /** 1-10 kullanıcının manuel genel puanı */
  rating: number;
  /** Taktiksel diziliş: 4-3-3, 3-5-2 vb. */
  formation?: string;
  /** Maçın Adamı */
  manOfTheMatch?: string;
  /** Alt kategori puanları */
  categoryRatings?: CategoryRatings;
  /** Alt puanlardan hesaplanan ağırlıklı ortalama */
  weightedRating?: number;
  likeCount?: number;
  createdAt: Date;
  updatedAt: Date;
}

/** Sistem koleksiyonları için sabit tipler */
export type CollectionType = "WATCHED" | "WATCHLIST" | "FAVORITES" | "CUSTOM";

export const DEFAULT_COLLECTION_NAMES: Record<Exclude<CollectionType, "CUSTOM">, string> = {
  WATCHED:   "İzledim",
  WATCHLIST: "Gideceğim",
  FAVORITES: "Favorilerim",
};

export const DEFAULT_COLLECTION_ORDER: CollectionType[] = [
  "WATCHED",
  "WATCHLIST",
  "FAVORITES",
];

export interface CollectionMatch {
  id: string;
  collectionId: string;
  matchId: string;
  addedAt: Date;
  match?: Match;
}

export interface Collection {
  id: string;
  userId: string;
  name: string;
  description?: string;
  isPublic: boolean;
  type: CollectionType;
  matches?: CollectionMatch[];
  createdAt: Date;
  updatedAt: Date;
}

// ─── İstatistik tipleri (Modül 5) ───────────────────────────────────────────

/** Son 1 ayın en çok incelenen / en yüksek puanlı maçları */
export interface TopMatchStat {
  matchId: string;
  homeTeamName: string;
  awayTeamName: string;
  competition: string;
  matchDate: string;
  homeScore: number;
  awayScore: number;
  avgWeightedRating: number | null;
  avgRating: number;
  reviewCount: number;
}

/** Kullanıcının en çok analiz ettiği lig ve o ligdeki favori takımı */
export interface UserLeagueStat {
  topLeague: string;
  reviewCountInLeague: number;
  favoriteTeamInLeague: string | null;
  favoriteTeamReviewCount: number;
}

/** Maçın Adamı sıralaması */
export interface TopMotmPlayer {
  playerName: string;
  count: number;
}

export interface StatsReport {
  topMatchesLastMonth: TopMatchStat[];
  topMotmPlayers: TopMotmPlayer[];
  /** null ise kullanıcı hiç analiz yazmamış */
  userLeagueStat: UserLeagueStat | null;
}
