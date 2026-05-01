import Image from "next/image";
import Link from "next/link";
import { Flame } from "lucide-react";

export type TrendingMatch = {
  rank: number;
  matchId: string;
  homeTeamName: string;
  awayTeamName: string;
  homeCrest: string | null;
  awayCrest: string | null;
  competition: string;
  homeScore: number;
  awayScore: number;
  reviewCount: number;
  avgRating: number;
};

// ─── Sıralama Rozeti ──────────────────────────────────────────────────────────

function RankBadge({ rank }: { rank: number }) {
  const styles: Record<number, string> = {
    1: "bg-amber-400/20 text-amber-300 border-amber-400/30",
    2: "bg-neutral-400/15 text-neutral-300 border-neutral-400/25",
    3: "bg-orange-600/20 text-orange-400 border-orange-600/30",
  };
  const cls = styles[rank] ?? "bg-[var(--border)]/60 text-[var(--muted)] border-[var(--border)]";
  return (
    <div
      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border text-xs font-bold ${cls}`}
    >
      {rank}
    </div>
  );
}

// ─── Takım Arması ─────────────────────────────────────────────────────────────

function Crest({ src, alt }: { src: string | null; alt: string }) {
  if (!src) {
    return (
      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--background)] text-xs text-[var(--muted)] ring-1 ring-[var(--border)]">
        —
      </div>
    );
  }
  return (
    <div className="relative h-7 w-7 shrink-0 overflow-hidden rounded-full bg-[var(--background)] ring-1 ring-[var(--border)]">
      <Image src={src} alt={alt} fill className="object-contain" unoptimized sizes="28px" />
    </div>
  );
}

// ─── Tek Satır ────────────────────────────────────────────────────────────────

function TrendingRow({ match, maxReviews }: { match: TrendingMatch; maxReviews: number }) {
  const barWidth = maxReviews > 0 ? Math.round((match.reviewCount / maxReviews) * 100) : 0;

  return (
    <li>
      <Link
        href={`/matches/${match.matchId}`}
        className="group flex items-center gap-3 rounded-lg px-3 py-3 transition-colors hover:bg-white/5"
      >
        <RankBadge rank={match.rank} />

        {/* Takım bilgileri */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <Crest src={match.homeCrest} alt={match.homeTeamName} />
            <span className="truncate text-sm font-medium text-[var(--foreground)]">
              {match.homeTeamName}
            </span>
            <span className="shrink-0 rounded bg-[var(--background)] px-1.5 py-0.5 font-mono text-xs font-bold text-[var(--foreground)]">
              {match.homeScore}–{match.awayScore}
            </span>
            <span className="truncate text-sm font-medium text-[var(--foreground)]">
              {match.awayTeamName}
            </span>
            <Crest src={match.awayCrest} alt={match.awayTeamName} />
          </div>

          {/* Alt satır: lig + bar */}
          <div className="mt-1.5 flex items-center gap-2">
            <span className="shrink-0 rounded-md bg-[var(--background)] px-1.5 py-0.5 text-xs text-[var(--muted)]">
              {match.competition}
            </span>
            {/* Bar — analiz yoğunluğu */}
            <div className="h-1 flex-1 overflow-hidden rounded-full bg-[var(--border)]">
              <div
                className="h-full rounded-full bg-[var(--stadium-green)] transition-all duration-500"
                style={{ width: `${barWidth}%` }}
              />
            </div>
          </div>
        </div>

        {/* Sağ: istatistikler */}
        <div className="shrink-0 text-right">
          <div className="text-sm font-bold text-[var(--stadium-green)]">
            {match.avgRating > 0 ? `${match.avgRating}/10` : "—"}
          </div>
          <div className="text-xs text-[var(--muted)]">
            {match.reviewCount} analiz
          </div>
        </div>
      </Link>
    </li>
  );
}

// ─── Ana Bileşen ──────────────────────────────────────────────────────────────

export default function TrendingMatches({ matches }: { matches: TrendingMatch[] }) {
  const maxReviews = matches[0]?.reviewCount ?? 1;

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--card-bg)] p-6">
      {/* Başlık */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--stadium-green-muted)]">
            <Flame className="h-4 w-4 text-[var(--stadium-green)]" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-[var(--foreground)]">Gündemde</h2>
            <p className="text-xs text-[var(--muted)]">Son 30 günün en çok analiz edilen maçları</p>
          </div>
        </div>
      </div>

      {/* Liste */}
      {matches.length === 0 ? (
        <div className="py-8 text-center text-sm text-[var(--muted)]">
          Henüz yeterli analiz bulunmuyor.
        </div>
      ) : (
        <ul className="divide-y divide-[var(--border)]">
          {matches.map((m) => (
            <TrendingRow key={m.matchId} match={m} maxReviews={maxReviews} />
          ))}
        </ul>
      )}
    </div>
  );
}
