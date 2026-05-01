"use client";

import { useState, useCallback, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  computeWeightedRating,
  CATEGORY_LABELS,
  CATEGORY_WEIGHTS,
  type CategoryRatings,
} from "@/lib/schema";
import { updateReview, type UpdateReviewPayload } from "./actions";

const FORMATIONS = [
  "4-3-3", "4-4-2", "4-2-3-1", "3-5-2", "3-4-3",
  "5-3-2", "4-5-1", "4-1-4-1", "3-6-1", "5-4-1",
];

const DEFAULT_CATS: CategoryRatings = {
  tempo: 5, tacticalLevel: 5, excitement: 5, referee: 5, atmosphere: 5,
};

type Props = {
  reviewId:      string;
  matchLabel:    string; // "Galatasaray 3–1 Fenerbahçe"
  initial: {
    title:          string | null;
    content:        string;
    rating:         number;
    formation:      string | null;
    manOfTheMatch:  string | null;
    categoryRatings: CategoryRatings | null;
  };
};

export default function EditReviewForm({ reviewId, matchLabel, initial }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [title, setTitle]                 = useState(initial.title ?? "");
  const [content, setContent]             = useState(initial.content);
  const [rating, setRating]               = useState(initial.rating);
  const [formation, setFormation]         = useState(initial.formation ?? "");
  const [manOfTheMatch, setManOfTheMatch] = useState(initial.manOfTheMatch ?? "");
  const [useCatRatings, setUseCatRatings] = useState(initial.categoryRatings !== null);
  const [catRatings, setCatRatings]       = useState<CategoryRatings>(
    initial.categoryRatings ?? DEFAULT_CATS
  );
  const [error, setError] = useState("");

  const setCat = useCallback(
    (key: keyof CategoryRatings, value: number) =>
      setCatRatings((prev) => ({ ...prev, [key]: value })),
    []
  );

  const weightedRating = useCatRatings
    ? Math.round(computeWeightedRating(catRatings) * 10) / 10
    : null;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    const payload: UpdateReviewPayload = {
      title:           title.trim() || null,
      content:         content.trim(),
      rating,
      formation:       formation || null,
      manOfTheMatch:   manOfTheMatch.trim() || null,
      categoryRatings: useCatRatings ? catRatings : null,
    };

    startTransition(async () => {
      try {
        const { matchId } = await updateReview(reviewId, payload);
        router.push(`/matches/${matchId}`);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Güncelleme başarısız");
      }
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] p-6 sm:p-8"
    >
      {/* Maç bilgisi (read-only) */}
      <div className="mb-6 rounded-xl bg-[var(--background)] px-4 py-3 text-sm text-[var(--muted)]">
        Maç:{" "}
        <span className="font-semibold text-[var(--foreground)]">{matchLabel}</span>
      </div>

      {error && (
        <div className="mb-5 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-sm text-red-400">
          {error}
        </div>
      )}

      <div className="space-y-5">
        {/* Taktiksel diziliş + Maçın Adamı */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="formation" className="mb-1.5 block text-sm font-medium text-[var(--foreground)]">
              Taktiksel Diziliş
            </label>
            <select
              id="formation"
              value={formation}
              onChange={(e) => setFormation(e.target.value)}
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-4 py-2.5 text-[var(--foreground)] focus:border-[var(--stadium-green)] focus:outline-none focus:ring-1 focus:ring-[var(--stadium-green)]"
            >
              <option value="">Diziliş seçin</option>
              {FORMATIONS.map((f) => (
                <option key={f} value={f}>{f}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="motm" className="mb-1.5 block text-sm font-medium text-[var(--foreground)]">
              Maçın Adamı
            </label>
            <input
              id="motm"
              type="text"
              value={manOfTheMatch}
              onChange={(e) => setManOfTheMatch(e.target.value)}
              placeholder="Oyuncu adı"
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-4 py-2.5 text-[var(--foreground)] placeholder:text-[var(--muted)] focus:border-[var(--stadium-green)] focus:outline-none focus:ring-1 focus:ring-[var(--stadium-green)]"
            />
          </div>
        </div>

        {/* Genel puan */}
        <div>
          <label htmlFor="rating" className="mb-1.5 block text-sm font-medium text-[var(--foreground)]">
            Genel Puan (1–10)
          </label>
          <div className="flex items-center gap-4">
            <input
              id="rating"
              type="range"
              min={1}
              max={10}
              value={rating}
              onChange={(e) => setRating(Number(e.target.value))}
              className="h-2 flex-1 accent-[var(--stadium-green)]"
            />
            <span className="w-8 text-right text-xl font-bold tabular-nums text-[var(--stadium-green)]">
              {rating}
            </span>
          </div>
        </div>

        {/* Kategori puanları toggle */}
        <div className="rounded-xl border border-[var(--border)] p-4">
          <label className="flex cursor-pointer items-center gap-3">
            <input
              type="checkbox"
              checked={useCatRatings}
              onChange={(e) => setUseCatRatings(e.target.checked)}
              className="h-4 w-4 accent-[var(--stadium-green)]"
            />
            <span className="text-sm font-medium text-[var(--foreground)]">
              Detaylı kategori puanı (Ağırlıklı Puan hesaplanır)
            </span>
          </label>

          {useCatRatings && (
            <div className="mt-4 space-y-3">
              {(Object.keys(CATEGORY_LABELS) as (keyof CategoryRatings)[]).map((key) => (
                <div key={key}>
                  <div className="mb-1 flex items-center justify-between">
                    <span className="text-xs text-[var(--muted)]">
                      {CATEGORY_LABELS[key]}
                      <span className="ml-1 text-[var(--muted)]/60">
                        ({Math.round(CATEGORY_WEIGHTS[key] * 100)}%)
                      </span>
                    </span>
                    <span className="text-xs font-semibold text-[var(--stadium-green)]">
                      {catRatings[key]}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={1}
                    max={10}
                    value={catRatings[key]}
                    onChange={(e) => setCat(key, Number(e.target.value))}
                    className="h-1.5 w-full accent-[var(--stadium-green)]"
                  />
                </div>
              ))}
              <div className="mt-3 flex items-center justify-between rounded-lg bg-[var(--stadium-green)]/10 px-4 py-2.5">
                <span className="text-sm font-medium text-[var(--foreground)]">Ağırlıklı Puan</span>
                <span className="text-xl font-bold text-[var(--stadium-green)]">
                  {weightedRating}
                  <span className="ml-1 text-sm font-normal text-[var(--muted)]">/ 10</span>
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Başlık */}
        <div>
          <label htmlFor="title" className="mb-1.5 block text-sm font-medium text-[var(--foreground)]">
            Başlık <span className="text-[var(--muted)]">(isteğe bağlı)</span>
          </label>
          <input
            id="title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Örn: Derbi analizi"
            className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-4 py-2.5 text-[var(--foreground)] placeholder:text-[var(--muted)] focus:border-[var(--stadium-green)] focus:outline-none focus:ring-1 focus:ring-[var(--stadium-green)]"
          />
        </div>

        {/* İçerik */}
        <div>
          <label htmlFor="content" className="mb-1.5 block text-sm font-medium text-[var(--foreground)]">
            Teknik yorum
          </label>
          <textarea
            id="content"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={6}
            required
            className="w-full resize-y rounded-lg border border-[var(--border)] bg-[var(--background)] px-4 py-2.5 text-[var(--foreground)] placeholder:text-[var(--muted)] focus:border-[var(--stadium-green)] focus:outline-none focus:ring-1 focus:ring-[var(--stadium-green)]"
          />
        </div>
      </div>

      {/* Alt butonlar */}
      <div className="mt-6 flex items-center justify-between gap-3">
        {weightedRating !== null && (
          <p className="text-xs text-[var(--muted)]">
            Ağırlıklı puan:{" "}
            <span className="font-semibold text-[var(--stadium-green)]">{weightedRating}</span>
          </p>
        )}
        <div className="ml-auto flex gap-3">
          <button
            type="button"
            onClick={() => router.back()}
            className="rounded-lg border border-[var(--border)] px-4 py-2.5 text-sm font-medium text-[var(--foreground)] hover:bg-[var(--card-bg)]"
          >
            İptal
          </button>
          <button
            type="submit"
            disabled={isPending}
            className="rounded-lg bg-[var(--stadium-green)] px-6 py-2.5 font-medium text-white transition-colors hover:bg-[var(--stadium-green-hover)] disabled:opacity-50"
          >
            {isPending ? "Kaydediliyor…" : "Değişiklikleri Kaydet"}
          </button>
        </div>
      </div>
    </form>
  );
}
