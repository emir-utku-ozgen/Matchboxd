"use client";

import { useTransition, useState } from "react";
import { Trash2, Loader2 } from "lucide-react";
import { deleteMyReview } from "./actions";

export default function DeleteMyReviewButton({ reviewId }: { reviewId: string }) {
  const [isPending, startTransition] = useTransition();
  const [confirming, setConfirming]  = useState(false);
  const [error, setError]            = useState("");

  function handleClick() {
    if (!confirming) {
      setConfirming(true);
      setTimeout(() => setConfirming(false), 3000);
      return;
    }
    setConfirming(false);
    setError("");
    startTransition(async () => {
      try {
        await deleteMyReview(reviewId);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Silme başarısız");
      }
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={handleClick}
        disabled={isPending}
        className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-all disabled:cursor-wait disabled:opacity-50 ${
          confirming
            ? "animate-pulse bg-red-500/20 text-red-400 ring-1 ring-red-500/40"
            : "border border-[var(--border)] text-[var(--muted)] hover:border-red-500/40 hover:bg-red-500/10 hover:text-red-400"
        }`}
      >
        {isPending ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <Trash2 className="h-3.5 w-3.5" />
        )}
        {confirming ? "Emin misin?" : "Sil"}
      </button>
      {error && <span className="text-[10px] text-red-400">{error}</span>}
    </div>
  );
}
