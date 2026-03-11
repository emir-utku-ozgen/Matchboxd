"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  matchId: string;
  homeTeamName: string;
  awayTeamName: string;
};

export default function NewReviewForm({
  matchId,
  homeTeamName,
  awayTeamName,
}: Props) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [rating, setRating] = useState(5);
  const [manOfTheMatch, setManOfTheMatch] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          matchId,
          title: title.trim() || null,
          content: content.trim(),
          rating,
          manOfTheMatch: manOfTheMatch.trim() || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Kayıt başarısız");
        return;
      }
      router.push("/reviews");
      router.refresh();
    } catch {
      setError("Bağlantı hatası");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-xl border border-[var(--border)] bg-[var(--card-bg)] p-6 sm:p-8"
    >
      {error && (
        <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm text-red-400">
          {error}
        </div>
      )}

      <div className="mb-6 rounded-lg bg-[var(--background)] px-4 py-3 text-sm text-[var(--muted)]">
        Maç: <span className="font-medium text-[var(--foreground)]">{homeTeamName}</span>
        {" vs "}
        <span className="font-medium text-[var(--foreground)]">{awayTeamName}</span>
      </div>

      <div className="space-y-5">
        <div>
          <label htmlFor="rating" className="mb-1.5 block text-sm font-medium text-[var(--foreground)]">
            Puan (1–10)
          </label>
          <div className="flex items-center gap-3">
            <input
              id="rating"
              type="range"
              min={1}
              max={10}
              value={rating}
              onChange={(e) => setRating(Number(e.target.value))}
              className="h-2 flex-1 accent-[var(--stadium-green)]"
            />
            <span className="w-8 text-right font-semibold text-[var(--stadium-green)]">
              {rating}
            </span>
          </div>
        </div>

        <div>
          <label htmlFor="manOfTheMatch" className="mb-1.5 block text-sm font-medium text-[var(--foreground)]">
            Maçın Adamı
          </label>
          <input
            id="manOfTheMatch"
            type="text"
            value={manOfTheMatch}
            onChange={(e) => setManOfTheMatch(e.target.value)}
            placeholder="Oyuncu adı"
            className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-4 py-2.5 text-[var(--foreground)] placeholder:text-[var(--muted)] focus:border-[var(--stadium-green)] focus:outline-none focus:ring-1 focus:ring-[var(--stadium-green)]"
          />
        </div>

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

        <div>
          <label htmlFor="content" className="mb-1.5 block text-sm font-medium text-[var(--foreground)]">
            Teknik yorum
          </label>
          <textarea
            id="content"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Maç hakkındaki analiz ve yorumunuz..."
            rows={5}
            required
            className="w-full resize-y rounded-lg border border-[var(--border)] bg-[var(--background)] px-4 py-2.5 text-[var(--foreground)] placeholder:text-[var(--muted)] focus:border-[var(--stadium-green)] focus:outline-none focus:ring-1 focus:ring-[var(--stadium-green)]"
          />
        </div>
      </div>

      <div className="mt-6 flex justify-end gap-3">
        <button
          type="button"
          onClick={() => router.back()}
          className="rounded-lg border border-[var(--border)] px-4 py-2.5 text-sm font-medium text-[var(--foreground)] hover:bg-[var(--card-bg)]"
        >
          İptal
        </button>
        <button
          type="submit"
          disabled={loading}
          className="rounded-lg bg-[var(--stadium-green)] px-6 py-2.5 font-medium text-white transition-colors hover:bg-[var(--stadium-green-hover)] disabled:opacity-50"
        >
          {loading ? "Kaydediliyor..." : "Analizi gönder"}
        </button>
      </div>
    </form>
  );
}
