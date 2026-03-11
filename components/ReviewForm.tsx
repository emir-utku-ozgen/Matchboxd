"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";

type Match = {
  id: string;
  homeTeamName: string;
  awayTeamName: string;
  homeScore: number;
  awayScore: number;
  matchDate: string;
  competition: string;
};

export default function ReviewForm() {
  const { data: session, status } = useSession();
  const [matches, setMatches] = useState<Match[]>([]);
  const [matchId, setMatchId] = useState("");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [rating, setRating] = useState(5);
  const [manOfTheMatch, setManOfTheMatch] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    fetch("/api/matches")
      .then((res) => res.json())
      .then((data) => {
        const list = Array.isArray(data) ? data : [];
        setMatches(list);
        if (list.length > 0 && !matchId) setMatchId(list[0].id);
      })
      .catch(() => setMatches([]));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess(false);
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
        setError(data.error || "Kayıt başarısız");
        return;
      }
      setSuccess(true);
      setContent("");
      setTitle("");
      setManOfTheMatch("");
      setRating(5);
    } catch {
      setError("Bağlantı hatası");
    } finally {
      setLoading(false);
    }
  }

  const formatMatch = (m: Match) =>
    `${m.homeTeamName} ${m.homeScore} - ${m.awayScore} ${m.awayTeamName} (${m.competition})`;

  if (status === "loading") {
    return (
      <div className="rounded-xl border border-[var(--border)] bg-[var(--card-bg)] p-8 text-center text-[var(--muted)]">
        Yükleniyor...
      </div>
    );
  }

  if (!session) {
    return (
      <div className="rounded-xl border border-[var(--border)] bg-[var(--card-bg)] p-8 text-center">
        <p className="mb-4 text-[var(--muted)]">
          Analiz yazmak için giriş yapmalısınız.
        </p>
        <Link
          href="/login"
          className="inline-block rounded-lg bg-[var(--stadium-green)] px-6 py-2.5 font-medium text-white hover:bg-[var(--stadium-green-hover)]"
        >
          Giriş Yap
        </Link>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-xl border border-[var(--border)] bg-[var(--card-bg)] p-6 sm:p-8"
    >
      <h2 className="mb-6 text-lg font-semibold text-[var(--stadium-green)]">
        Yeni analiz yaz
      </h2>

      {error && (
        <div className="mb-4 rounded-lg bg-red-500/10 border border-red-500/30 px-4 py-2 text-sm text-red-400">
          {error}
        </div>
      )}
      {success && (
        <div className="mb-4 rounded-lg bg-[var(--stadium-green-muted)] border border-[var(--stadium-green)]/30 px-4 py-2 text-sm text-[var(--stadium-green)]">
          Analiz kaydedildi.
        </div>
      )}

      <div className="space-y-5">
        <div>
          <label htmlFor="match" className="mb-1.5 block text-sm font-medium text-[var(--foreground)]">
            Maç
          </label>
          <select
            id="match"
            value={matchId}
            onChange={(e) => setMatchId(e.target.value)}
            className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-4 py-2.5 text-[var(--foreground)] focus:border-[var(--stadium-green)] focus:outline-none focus:ring-1 focus:ring-[var(--stadium-green)]"
            required
          >
            <option value="">Maç seçin</option>
            {matches.map((m) => (
              <option key={m.id} value={m.id}>
                {formatMatch(m)}
              </option>
            ))}
          </select>
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

      <div className="mt-6 flex justify-end">
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
