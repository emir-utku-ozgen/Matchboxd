"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import {
  computeWeightedRating,
  CATEGORY_LABELS,
  CATEGORY_WEIGHTS,
  type CategoryRatings,
} from "@/lib/schema";

const FORMATIONS = [
  "4-3-3", "4-4-2", "4-2-3-1", "3-5-2", "3-4-3",
  "5-3-2", "4-5-1", "4-1-4-1", "3-6-1", "5-4-1",
];

type Match = {
  id: string;
  homeTeamName: string;
  awayTeamName: string;
  homeScore: number;
  awayScore: number;
  matchDate: string;
  competition: string;
};

type Props = {
  /** Maç detay sayfasından gelince hangi maçın seçili olacağını belirler */
  initialMatchId?: string;
};

const DEFAULT_CATS: CategoryRatings = {
  tempo: 5,
  tacticalLevel: 5,
  excitement: 5,
  referee: 5,
  atmosphere: 5,
};

export default function ReviewForm({ initialMatchId }: Props) {
  const { data: session, status } = useSession();
  const [matches, setMatches]           = useState<Match[]>([]);
  const [matchId, setMatchId]           = useState(initialMatchId ?? "");
  const [title, setTitle]               = useState("");
  const [content, setContent]           = useState("");
  const [rating, setRating]             = useState(5);
  const [formation, setFormation]       = useState("");
  const [manOfTheMatch, setManOfTheMatch] = useState("");
  const [useCatRatings, setUseCatRatings] = useState(false);
  const [catRatings, setCatRatings]     = useState<CategoryRatings>(DEFAULT_CATS);
  const [loading, setLoading]           = useState(false);
  const [error, setError]               = useState("");
  const [success, setSuccess]           = useState(false);

  useEffect(() => {
    fetch("/api/matches")
      .then((res) => res.json())
      .then((data) => {
        const list = Array.isArray(data) ? data : [];
        setMatches(list);
        // initialMatchId varsa onu koru; yoksa ilk maçı seç
        if (list.length > 0 && !initialMatchId) setMatchId(list[0].id);
      })
      .catch(() => setMatches([]));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const weightedRating = useCatRatings
    ? Math.round(computeWeightedRating(catRatings) * 10) / 10
    : null;

  const setCat = useCallback(
    (key: keyof CategoryRatings, value: number) =>
      setCatRatings((prev) => ({ ...prev, [key]: value })),
    []
  );

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
          title:         title.trim() || null,
          content:       content.trim(),
          rating,
          formation:     formation || null,
          manOfTheMatch: manOfTheMatch.trim() || null,
          categoryRatings: useCatRatings ? catRatings : undefined,
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
      setFormation("");
      setRating(5);
      setCatRatings(DEFAULT_CATS);
      setUseCatRatings(false);
    } catch {
      setError("Bağlantı hatası");
    } finally {
      setLoading(false);
    }
  }

  const formatMatch = (m: Match) =>
    `${m.homeTeamName} ${m.homeScore}–${m.awayScore} ${m.awayTeamName} (${m.competition})`;

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
        <p className="mb-4 text-[var(--muted)]">Analiz yazmak için giriş yapmalısınız.</p>
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
        {/* Maç seçimi */}
        <div>
          <label htmlFor="match" className="mb-1.5 block text-sm font-medium text-[var(--foreground)]">
            Maç
          </label>
          <select
            id="match"
            value={matchId}
            onChange={(e) => setMatchId(e.target.value)}
            required
            className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-4 py-2.5 text-[var(--foreground)] focus:border-[var(--stadium-green)] focus:outline-none focus:ring-1 focus:ring-[var(--stadium-green)]"
          >
            <option value="">Maç seçin</option>
            {matches.map((m) => (
              <option key={m.id} value={m.id}>{formatMatch(m)}</option>
            ))}
          </select>
        </div>

        {/* Taktiksel diziliş */}
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

          {/* Maçın Adamı */}
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
        </div>

        {/* Genel puan */}
        <div>
          <label htmlFor="rating" className="mb-1.5 block text-sm font-medium text-[var(--foreground)]">
            Genel Puan (1–10)
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
            <span className="w-8 text-right font-semibold text-[var(--stadium-green)]">{rating}</span>
          </div>
        </div>

        {/* Alt kategori puanları toggle */}
        <div className="rounded-lg border border-[var(--border)] p-4">
          <label className="flex cursor-pointer items-center gap-3">
            <input
              type="checkbox"
              checked={useCatRatings}
              onChange={(e) => setUseCatRatings(e.target.checked)}
              className="h-4 w-4 accent-[var(--stadium-green)]"
            />
            <span className="text-sm font-medium text-[var(--foreground)]">
              Detaylı kategori puanı gir (Ağırlıklı Puan hesaplanır)
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

              {/* Ağırlıklı puan önizlemesi */}
              <div className="mt-4 flex items-center justify-between rounded-lg bg-[var(--stadium-green)]/10 px-4 py-2.5">
                <span className="text-sm font-medium text-[var(--foreground)]">
                  Ağırlıklı Puan
                </span>
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

        {/* Teknik yorum */}
        <div>
          <label htmlFor="content" className="mb-1.5 block text-sm font-medium text-[var(--foreground)]">
            Teknik yorum
          </label>
          <textarea
            id="content"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Maçın taktiksel yapısı, kritik anlar ve genel değerlendirmeniz..."
            rows={5}
            required
            className="w-full resize-y rounded-lg border border-[var(--border)] bg-[var(--background)] px-4 py-2.5 text-[var(--foreground)] placeholder:text-[var(--muted)] focus:border-[var(--stadium-green)] focus:outline-none focus:ring-1 focus:ring-[var(--stadium-green)]"
          />
        </div>
      </div>

      <div className="mt-6 flex items-center justify-between">
        {weightedRating !== null && (
          <p className="text-xs text-[var(--muted)]">
            Ağırlıklı puan hesaplandı:{" "}
            <span className="font-semibold text-[var(--stadium-green)]">{weightedRating}</span>
          </p>
        )}
        <button
          type="submit"
          disabled={loading}
          className="ml-auto rounded-lg bg-[var(--stadium-green)] px-6 py-2.5 font-medium text-white transition-colors hover:bg-[var(--stadium-green-hover)] disabled:opacity-50"
        >
          {loading ? "Kaydediliyor..." : "Analizi gönder"}
        </button>
      </div>
    </form>
  );
}
