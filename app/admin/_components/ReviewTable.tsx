"use client";

import { useState, useTransition } from "react";
import { Trash2, Star, Flag } from "lucide-react";
import ConfirmDialog from "./ConfirmDialog";
import { deleteReview } from "../actions";

export type ReviewRow = {
  id: string;
  userName: string;
  userEmail: string | null;
  matchId: string;
  matchName: string;   // "GS - FB"
  content: string;
  rating: number;
  createdAt: string; // ISO
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("tr-TR", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function timeAgo(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60)   return `${diff} sn önce`;
  if (diff < 3600) return `${Math.floor(diff / 60)} dk önce`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} sa önce`;
  return `${Math.floor(diff / 86400)} gün önce`;
}

// Puanın rengini belirle
function ratingColor(r: number) {
  if (r >= 8) return "bg-[var(--stadium-green-muted)] text-[var(--stadium-green)]";
  if (r >= 5) return "bg-blue-500/15 text-blue-400";
  return "bg-red-500/15 text-red-400";
}

// ─── Ana Bileşen ──────────────────────────────────────────────────────────────

export default function ReviewTable({ initialReviews }: { initialReviews: ReviewRow[] }) {
  const [reviews, setReviews]        = useState<ReviewRow[]>(initialReviews);
  const [deleteTarget, setTarget]    = useState<ReviewRow | null>(null);
  const [isPending, startTransition] = useTransition();

  function confirmDelete() {
    if (!deleteTarget) return;
    startTransition(async () => {
      try {
        await deleteReview(deleteTarget.id);
        setReviews((prev) => prev.filter((r) => r.id !== deleteTarget.id));
      } catch (err) {
        console.error(err);
        alert("Silme işlemi başarısız oldu.");
      } finally {
        setTarget(null);
      }
    });
  }

  return (
    <>
      <div className="divide-y divide-[var(--border)] overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--card-bg)]">
        {reviews.length === 0 ? (
          <div className="flex flex-col items-center gap-3 px-5 py-12 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--stadium-green-muted)]">
              <Flag className="h-5 w-5 text-[var(--stadium-green)]" />
            </div>
            <p className="text-[var(--muted)]">Görüntülenecek analiz yok.</p>
          </div>
        ) : (
          reviews.map((r) => (
            <div
              key={r.id}
              className="flex gap-4 p-5 transition-colors hover:bg-white/[0.025]"
            >
              {/* Avatar */}
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--stadium-green-muted)] text-sm font-bold text-[var(--stadium-green)]">
                {r.userName.charAt(0).toUpperCase()}
              </div>

              {/* İçerik */}
              <div className="min-w-0 flex-1">
                {/* Üst satır: yazar, e-posta, puan */}
                <div className="mb-1.5 flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span className="text-sm font-semibold text-[var(--foreground)]">
                    {r.userName}
                  </span>
                  {r.userEmail && (
                    <span className="text-xs text-[var(--muted)]">{r.userEmail}</span>
                  )}
                  <span
                    className={`ml-auto inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-bold ${ratingColor(r.rating)}`}
                  >
                    <Star className="h-3 w-3 fill-current" />
                    {r.rating}/10
                  </span>
                </div>

                {/* Maç adı */}
                <p className="mb-1.5 text-xs font-medium text-[var(--stadium-green)]">
                  ⚽ {r.matchName}
                </p>

                {/* Analiz içeriği */}
                <p className="mb-2 line-clamp-3 text-sm leading-relaxed text-[var(--muted)]">
                  {r.content}
                </p>

                {/* Zaman */}
                <p className="text-xs text-[var(--muted)]/60" title={formatDate(r.createdAt)}>
                  {timeAgo(r.createdAt)}
                </p>
              </div>

              {/* Sil butonu */}
              <div className="shrink-0 pt-1">
                <button
                  type="button"
                  onClick={() => setTarget(r)}
                  disabled={isPending}
                  className="flex items-center gap-1.5 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-xs font-medium text-red-400 transition hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-40"
                  title="Analizi sil"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Sil
                </button>
              </div>
            </div>
          ))
        )}

        {/* Alt bilgi */}
        {reviews.length > 0 && (
          <div className="border-t border-[var(--border)] px-5 py-2.5 text-xs text-[var(--muted)]">
            Son {reviews.length} analiz gösteriliyor.
          </div>
        )}
      </div>

      {/* Onay dialogu */}
      <ConfirmDialog
        isOpen={deleteTarget !== null}
        title="Analizi Sil"
        description={
          deleteTarget
            ? `"${deleteTarget.userName}" kullanıcısının "${deleteTarget.matchName}" maçına ait analizini kalıcı olarak silmek istediğinizden emin misiniz?`
            : ""
        }
        confirmLabel="Evet, Analizi Sil"
        loading={isPending}
        onConfirm={confirmDelete}
        onCancel={() => setTarget(null)}
      />
    </>
  );
}
