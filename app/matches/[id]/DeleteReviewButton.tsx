"use client";

import { useTransition, useState } from "react";
import { Trash2, Loader2 } from "lucide-react";
import { deleteMatchReview } from "./actions";

type Props = {
  reviewId: string;
  matchId:  string;
};

/**
 * Analiz silme butonu.
 * İlk tıkta "Emin misin?" onay moduna geçer; ikinci tıkta siler.
 * 3 saniye içinde ikinci tık gelmezse otomatik sıfırlanır.
 */
export default function DeleteReviewButton({ reviewId, matchId }: Props) {
  const [isPending, startTransition] = useTransition();
  const [confirming, setConfirming]  = useState(false);
  const [error, setError]            = useState("");

  function handleClick() {
    if (!confirming) {
      setConfirming(true);
      // 3 sn onay gelmezse iptal
      setTimeout(() => setConfirming(false), 3000);
      return;
    }

    setConfirming(false);
    setError("");
    startTransition(async () => {
      try {
        await deleteMatchReview(reviewId, matchId);
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
        title="Analizi sil"
        className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors disabled:cursor-wait disabled:opacity-50 ${
          confirming
            ? "animate-pulse bg-red-500/20 text-red-400 ring-1 ring-red-500/40"
            : "text-[var(--muted)] hover:bg-red-500/10 hover:text-red-400"
        }`}
      >
        {isPending ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <Trash2 className="h-3.5 w-3.5" />
        )}
        {confirming ? "Emin misin? (onayla)" : "Sil"}
      </button>

      {error && (
        <span className="text-[10px] text-red-400">{error}</span>
      )}
    </div>
  );
}
