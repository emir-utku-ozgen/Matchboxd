"use client";

import { useCallback, useEffect, useState } from "react";
import { Heart } from "lucide-react";

const STORAGE_KEY = "matchboxd_match_likes_v1";

function readLikedIds(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const arr = raw ? (JSON.parse(raw) as unknown) : [];
    return new Set(Array.isArray(arr) ? (arr as string[]) : []);
  } catch {
    return new Set();
  }
}

function persistLikedIds(ids: Set<string>) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify([...ids]));
}

export type LikeButtonProps = {
  matchId: string;
  initialLikeCount: number;
  /** Liste kartları için daha sıkı düzen */
  compact?: boolean;
};

export default function LikeButton({
  matchId,
  initialLikeCount,
  compact = false,
}: LikeButtonProps) {
  const [count, setCount] = useState(initialLikeCount);
  const [isLiked, setIsLiked] = useState(false);
  const [pending, setPending] = useState(false);
  const [pulse, setPulse] = useState(false);

  useEffect(() => {
    setCount(initialLikeCount);
  }, [initialLikeCount]);

  useEffect(() => {
    setIsLiked(readLikedIds().has(matchId));
  }, [matchId]);

  const handleClick = useCallback(
    async (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();

      const likedNow = readLikedIds();
      if (likedNow.has(matchId)) {
        setIsLiked(true);
        return;
      }
      if (pending) return;

      setPending(true);
      setPulse(true);
      const prevCount = count;
      setCount((c) => c + 1);
      setIsLiked(true);
      likedNow.add(matchId);
      persistLikedIds(likedNow);

      try {
        const res = await fetch(`/api/matches/${encodeURIComponent(matchId)}/like`, {
          method: "POST",
        });
        const data = (await res.json()) as { likeCount?: number; error?: string };
        if (!res.ok) throw new Error(data.error ?? "İstek başarısız");
        if (typeof data.likeCount === "number") setCount(data.likeCount);
      } catch {
        const rollback = readLikedIds();
        rollback.delete(matchId);
        persistLikedIds(rollback);
        setCount(prevCount);
        setIsLiked(false);
      } finally {
        setPending(false);
        window.setTimeout(() => setPulse(false), 420);
      }
    },
    [count, matchId, pending],
  );

  const pad = compact ? "gap-1 px-2 py-1" : "gap-2 px-3 py-2";
  const iconClass = compact ? "h-4 w-4" : "h-5 w-5";

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isLiked || pending}
      aria-label={isLiked ? "Bu maçı zaten beğendiniz" : "Maçı beğen"}
      aria-pressed={isLiked}
      className={`inline-flex items-center rounded-xl border border-[var(--border)] bg-[var(--card-bg)] text-[var(--foreground)] shadow-sm transition-all duration-200 hover:border-rose-400/40 hover:bg-rose-500/5 disabled:cursor-default disabled:opacity-90 ${pad} ${pulse ? "ring-2 ring-rose-400/30" : ""}`}
    >
      <Heart
        className={`${iconClass} shrink-0 transition-transform duration-300 ease-out will-change-transform ${pulse ? "scale-[1.22]" : "scale-100"} ${isLiked ? "fill-rose-500 text-rose-500 stroke-rose-500" : "fill-transparent text-[var(--muted)] stroke-[var(--muted)]"}`}
        strokeWidth={2}
      />
      <span className={`tabular-nums font-semibold ${compact ? "text-xs" : "text-sm"}`}>
        {count}
      </span>
    </button>
  );
}
