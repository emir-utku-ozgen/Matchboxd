"use client";

import { useCallback, useEffect, useState } from "react";
import { Heart } from "lucide-react";

export type ReviewLikeButtonProps = {
  reviewId: string;
  initialLikeCount: number;
  compact?: boolean;
};

export default function ReviewLikeButton({
  reviewId,
  initialLikeCount,
  compact = false,
}: ReviewLikeButtonProps) {
  const safeInitial = Number(initialLikeCount ?? 0);
  const [count, setCount] = useState(Number.isFinite(safeInitial) ? safeInitial : 0);
  const [liked, setLiked] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [pending, setPending] = useState(false);
  const [pulse, setPulse] = useState(false);

  useEffect(() => {
    const n = Number(initialLikeCount ?? 0);
    setCount(Number.isFinite(n) ? n : 0);
  }, [initialLikeCount]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/reviews/${encodeURIComponent(reviewId)}/like`, {
          credentials: "same-origin",
        });
        const data = (await res.json()) as { liked?: boolean; likeCount?: number };
        if (!cancelled && res.ok) {
          if (typeof data.likeCount === "number") setCount(data.likeCount);
          if (typeof data.liked === "boolean") setLiked(data.liked);
        }
      } catch {
        /* sessiz */
      } finally {
        if (!cancelled) setLoaded(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [reviewId]);

  const toggle = useCallback(async () => {
    if (pending || !loaded) return;
    setPending(true);
    setPulse(true);
    const prevLiked = liked;
    const prevCount = count;
    setLiked(!liked);
    setCount((c) => (prevLiked ? Math.max(0, c - 1) : c + 1));

    try {
      const res = await fetch(`/api/reviews/${encodeURIComponent(reviewId)}/like`, {
        method: "POST",
        credentials: "same-origin",
      });
      const data = (await res.json()) as { liked?: boolean; likeCount?: number; error?: string };
      if (!res.ok) throw new Error(data.error ?? "İstek başarısız");
      if (typeof data.liked === "boolean") setLiked(data.liked);
      if (typeof data.likeCount === "number") setCount(data.likeCount);
    } catch {
      setLiked(prevLiked);
      setCount(prevCount);
    } finally {
      setPending(false);
      window.setTimeout(() => setPulse(false), 380);
    }
  }, [pending, loaded, liked, count, reviewId]);

  const pad = compact ? "gap-1 px-2 py-1" : "gap-2 px-3 py-2";
  const iconClass = compact ? "h-4 w-4" : "h-5 w-5";

  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        void toggle();
      }}
      disabled={pending || !loaded}
      aria-label={liked ? "Beğeniyi kaldır" : "Analizi beğen"}
      aria-pressed={liked}
      className={`inline-flex items-center rounded-xl border border-[var(--border)] bg-[var(--card-bg)] text-[var(--foreground)] shadow-sm transition-all duration-200 hover:border-rose-400/40 hover:bg-rose-500/5 disabled:cursor-wait disabled:opacity-70 ${pad} ${pulse ? "ring-2 ring-rose-400/25" : ""}`}
    >
      <Heart
        className={`${iconClass} shrink-0 transition-transform duration-300 ease-out will-change-transform ${pulse ? "scale-[1.18]" : "scale-100"} ${liked ? "fill-rose-500 text-rose-500 stroke-rose-500" : "fill-transparent text-[var(--muted)] stroke-[var(--muted)]"}`}
        strokeWidth={2}
      />
      <span className={`tabular-nums font-semibold ${compact ? "text-xs" : "text-sm"}`}>{count}</span>
    </button>
  );
}
