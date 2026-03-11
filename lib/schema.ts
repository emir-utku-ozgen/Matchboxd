/**
 * Matchboxd - Futbol Müsabakaları Değerlendirme Sistemi
 * Veri modeli: User, Match, Review, Collection
 */

export type UserRole = "user" | "editor" | "admin";

export interface User {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string;
  role: UserRole;
  createdAt: Date;
  updatedAt: Date;
}

/** Maçın oynandığı lig / turnuva */
export type CompetitionType = "league" | "cup" | "international" | "friendly";

/** Detaylı teknik maç verileri */
export interface Match {
  id: string;
  homeTeamId: string;
  awayTeamId: string;
  homeTeamName: string;
  awayTeamName: string;
  homeScore: number;
  awayScore: number;
  competition: string;
  competitionType: CompetitionType;
  season: string;
  matchDate: Date;
  venue: string;
  /** İzlenecek / teknik analiz için önemli istatistikler */
  stats: MatchStats;
  createdAt: Date;
  updatedAt: Date;
}

export interface MatchStats {
  possessionHome: number; // 0-100
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
  passAccuracyHome?: number; // 0-100
  passAccuracyAway?: number;
}

/** Analiz ve puanlama */
export interface Review {
  id: string;
  matchId: string;
  userId: string;
  userName: string;
  title: string;
  content: string;
  /** 1-10 arası genel maç puanı */
  rating: number;
  /** Detaylı puanlama (opsiyonel) */
  categoryRatings?: {
    tempo: number;
    tacticalLevel: number;
    excitement: number;
    referee: number;
  };
  createdAt: Date;
  updatedAt: Date;
  likeCount?: number;
}

/** Kullanıcı koleksiyonları (listeler) */
export interface Collection {
  id: string;
  userId: string;
  name: string;
  description?: string;
  isPublic: boolean;
  matchIds: string[];
  createdAt: Date;
  updatedAt: Date;
}
