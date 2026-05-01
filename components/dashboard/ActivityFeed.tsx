import Link from "next/link";
import { Activity } from "lucide-react";

export type RecentReview = {
  id: string;
  userName: string;
  matchId: string;
  /** "Galatasaray - Fenerbahçe" */
  matchName: string;
  competition: string;
  homeScore: number;
  awayScore: number;
  /** 1-10 arası puan */
  rating: number;
  /** Analiz metni — bileşen içinde kırpılır */
  content: string;
  /** ISO 8601 */
  createdAt: string;
};

// ─── Yardımcı: Göreceli Zaman ─────────────────────────────────────────────────

function timeAgo(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60) return `${diff} saniye önce`;
  if (diff < 3600) return `${Math.floor(diff / 60)} dakika önce`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} saat önce`;
  if (diff < 604800) return `${Math.floor(diff / 86400)} gün önce`;
  return new Date(iso).toLocaleDateString("tr-TR", { day: "numeric", month: "short" });
}

// ─── Avatar ────────────────────────────────────────────────────────────────────

const AVATAR_COLORS = [
  "bg-emerald-500/20 text-emerald-400",
  "bg-blue-500/20 text-blue-400",
  "bg-violet-500/20 text-violet-400",
  "bg-amber-500/20 text-amber-400",
  "bg-rose-500/20 text-rose-400",
  "bg-cyan-500/20 text-cyan-400",
];

function Avatar({ name }: { name: string }) {
  const idx = name.charCodeAt(0) % AVATAR_COLORS.length;
  return (
    <div
      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold ${AVATAR_COLORS[idx]}`}
    >
      {name.charAt(0).toUpperCase()}
    </div>
  );
}

// ─── Yıldız Puan ──────────────────────────────────────────────────────────────

function RatingBadge({ rating }: { rating: number }) {
  const color =
    rating >= 8
      ? "bg-[var(--stadium-green-muted)] text-[var(--stadium-green)]"
      : rating >= 6
      ? "bg-blue-500/15 text-blue-400"
      : "bg-amber-500/15 text-amber-400";

  return (
    <span className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-semibold ${color}`}>
      ⭐ {rating}/10
    </span>
  );
}

// ─── Tek Kart ─────────────────────────────────────────────────────────────────

function FeedItem({ review }: { review: RecentReview }) {
  return (
    <li className="flex gap-3">
      {/* Zaman çizelgesi çizgisi */}
      <div className="flex flex-col items-center">
        <Avatar name={review.userName} />
        <div className="mt-1 w-px flex-1 bg-[var(--border)]" />
      </div>

      {/* İçerik */}
      <div className="min-w-0 flex-1 pb-5">
        <div className="mb-1 flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="text-sm font-semibold text-[var(--foreground)]">
            {review.userName}
          </span>
          <span className="text-xs text-[var(--muted)]">inceledi</span>
          <span className="rounded-md bg-[var(--background)] px-1.5 py-0.5 text-xs text-[var(--muted)]">
            {review.competition}
          </span>
          <span className="ml-auto text-xs text-[var(--muted)]">
            {timeAgo(review.createdAt)}
          </span>
        </div>

        <Link
          href={`/matches/${review.matchId}`}
          className="mb-2 block truncate text-sm font-medium text-[var(--stadium-green)] hover:underline"
        >
          {review.matchName}{" "}
          <span className="font-bold text-[var(--foreground)]">
            {review.homeScore}–{review.awayScore}
          </span>
        </Link>

        <p className="mb-2 line-clamp-2 text-xs leading-relaxed text-[var(--muted)]">
          {review.content}
        </p>

        <RatingBadge rating={review.rating} />
      </div>
    </li>
  );
}

// ─── Ana Bileşen ──────────────────────────────────────────────────────────────

export default function ActivityFeed({ reviews }: { reviews: RecentReview[] }) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--card-bg)] p-6">
      {/* Başlık */}
      <div className="mb-5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--stadium-green-muted)]">
            <Activity className="h-4 w-4 text-[var(--stadium-green)]" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-[var(--foreground)]">Son Aktiviteler</h2>
            <p className="text-xs text-[var(--muted)]">Platforma eklenen son analizler</p>
          </div>
        </div>
        <Link
          href="/reviews"
          className="text-xs text-[var(--stadium-green)] hover:underline"
        >
          Tümünü Gör →
        </Link>
      </div>

      {/* Liste */}
      {reviews.length === 0 ? (
        <div className="py-8 text-center text-sm text-[var(--muted)]">
          Henüz analiz bulunmuyor.
        </div>
      ) : (
        <ul className="space-y-0">
          {reviews.map((r) => (
            <FeedItem key={r.id} review={r} />
          ))}
        </ul>
      )}
    </div>
  );
}
