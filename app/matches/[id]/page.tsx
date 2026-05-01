import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { prisma } from "@/lib/db";
import ReviewForm from "@/components/ReviewForm";
import AddToCollectionButton from "@/components/AddToCollectionButton";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

function formatDate(date: Date) {
  return new Date(date).toLocaleDateString("tr-TR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function formatTime(date: Date) {
  return new Date(date).toLocaleTimeString("tr-TR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function MatchDetailPage({ params }: Props) {
  const { id } = await params;

  const match = await prisma.match.findUnique({
    where: { id },
    include: {
      reviews: {
        orderBy: { createdAt: "desc" },
        include: { user: { select: { id: true, name: true } } },
      },
    },
  });

  if (!match) notFound();

  const avgRating =
    match.reviews.length > 0
      ? match.reviews.reduce((s, r) => s + r.rating, 0) / match.reviews.length
      : null;

  const avgWeighted =
    match.reviews.filter((r) => r.weightedRating != null).length > 0
      ? match.reviews
          .filter((r) => r.weightedRating != null)
          .reduce((s, r) => s + (r.weightedRating ?? 0), 0) /
        match.reviews.filter((r) => r.weightedRating != null).length
      : null;

  return (
    <div className="min-h-screen bg-[var(--background)]">
      <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">

        {/* Üst bar: Geri + Koleksiyona Ekle */}
        <div className="mb-6 flex items-center justify-between gap-4">
          <Link
            href="/matches"
            className="inline-flex items-center gap-1.5 text-sm text-[var(--muted)] hover:text-[var(--stadium-green)]"
          >
            ← Maçlara dön
          </Link>
          {/* Letterboxd mantığı: oturum açık kullanıcı maçı koleksiyonuna ekler */}
          <AddToCollectionButton matchId={match.id} />
        </div>

        {/* Maç skoru kartı */}
        <div className="mb-8 rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] p-6 sm:p-8">
          <div className="mb-4 flex items-center justify-between">
            <span className="rounded-full bg-[var(--stadium-green-muted)] px-3 py-1 text-xs font-medium text-[var(--stadium-green)]">
              {match.competition}
            </span>
            <span className="text-xs text-[var(--muted)]">
              {formatDate(match.matchDate)} · {formatTime(match.matchDate)}
            </span>
          </div>

          <div className="flex items-center gap-4">
            {/* Ev sahibi */}
            <div className="flex flex-1 flex-col items-center gap-2 sm:flex-row sm:justify-end sm:gap-3">
              <span className="text-center text-lg font-semibold text-[var(--foreground)] sm:text-right">
                {match.homeTeamName}
              </span>
              <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-full bg-[var(--background)] ring-2 ring-[var(--border)]">
                {match.homeCrest ? (
                  <Image src={match.homeCrest} alt="" fill className="object-contain" unoptimized sizes="48px" />
                ) : (
                  <span className="flex h-full w-full items-center justify-center text-[var(--muted)]">⚽</span>
                )}
              </div>
            </div>

            {/* Skor */}
            <div className="flex shrink-0 flex-col items-center gap-1">
              <div className="flex items-center gap-3 text-4xl font-bold tabular-nums text-[var(--foreground)]">
                <span>{match.homeScore}</span>
                <span className="text-[var(--muted)]">—</span>
                <span>{match.awayScore}</span>
              </div>
              {match.status && (
                <span className="text-xs text-[var(--muted)]">{match.status}</span>
              )}
            </div>

            {/* Deplasman */}
            <div className="flex flex-1 flex-col items-center gap-2 sm:flex-row sm:gap-3">
              <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-full bg-[var(--background)] ring-2 ring-[var(--border)]">
                {match.awayCrest ? (
                  <Image src={match.awayCrest} alt="" fill className="object-contain" unoptimized sizes="48px" />
                ) : (
                  <span className="flex h-full w-full items-center justify-center text-[var(--muted)]">⚽</span>
                )}
              </div>
              <span className="text-center text-lg font-semibold text-[var(--foreground)] sm:text-left">
                {match.awayTeamName}
              </span>
            </div>
          </div>

          {/* Meta bilgiler */}
          <div className="mt-5 flex flex-wrap items-center justify-center gap-4 border-t border-[var(--border)] pt-5 text-sm text-[var(--muted)]">
            <span>📍 {match.venue}</span>
            <span>🏆 {match.season}</span>
            {match.reviews.length > 0 && (
              <>
                <span>
                  📝 {match.reviews.length} analiz
                </span>
                {avgRating && (
                  <span className="font-medium text-[var(--stadium-green)]">
                    ★ {avgRating.toFixed(1)} genel puan
                  </span>
                )}
                {avgWeighted && (
                  <span className="font-medium text-yellow-400">
                    ⚖️ {avgWeighted.toFixed(1)} ağırlıklı
                  </span>
                )}
              </>
            )}
          </div>
        </div>

        {/* Analiz formu */}
        <div className="mb-10">
          <h2 className="mb-4 text-xl font-bold text-[var(--foreground)]">Bu Maçı Analiz Et</h2>
          <ReviewForm initialMatchId={match.id} />
        </div>

        {/* Mevcut analizler */}
        {match.reviews.length > 0 && (
          <section>
            <h2 className="mb-5 text-xl font-bold text-[var(--foreground)]">
              Analizler
              <span className="ml-2 text-base font-normal text-[var(--muted)]">
                ({match.reviews.length})
              </span>
            </h2>
            <div className="space-y-4">
              {match.reviews.map((r) => {
                const catRatings = r.categoryRatingsJson
                  ? (() => { try { return JSON.parse(r.categoryRatingsJson!); } catch { return null; } })()
                  : null;

                return (
                  <article
                    key={r.id}
                    className="rounded-xl border border-[var(--border)] bg-[var(--card-bg)] p-5"
                  >
                    <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
                      <div>
                        {r.title && (
                          <h3 className="font-semibold text-[var(--foreground)]">{r.title}</h3>
                        )}
                        <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-[var(--muted)]">
                          {r.user ? (
                            <Link href={`/profile/${r.user.id}`} className="text-[var(--stadium-green)] hover:underline">
                              {r.user.name}
                            </Link>
                          ) : (
                            <span>{r.userName}</span>
                          )}
                          <span>·</span>
                          <span>{new Date(r.createdAt).toLocaleDateString("tr-TR")}</span>
                          {r.formation && (
                            <>
                              <span>·</span>
                              <span className="rounded bg-[var(--background)] px-1.5 py-0.5 font-mono">
                                {r.formation}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {r.weightedRating != null && (
                          <span className="rounded-full bg-yellow-400/10 px-2.5 py-1 text-xs font-semibold text-yellow-400">
                            ⚖️ {r.weightedRating.toFixed(1)}
                          </span>
                        )}
                        <span className="rounded-full bg-[var(--stadium-green-muted)] px-2.5 py-1 text-xs font-bold text-[var(--stadium-green)]">
                          ★ {r.rating}
                        </span>
                      </div>
                    </div>

                    <p className="text-sm leading-relaxed text-[var(--muted)]">{r.content}</p>

                    {r.manOfTheMatch && (
                      <p className="mt-3 text-xs text-[var(--muted)]">
                        🏅 Maçın Adamı:{" "}
                        <span className="font-medium text-[var(--foreground)]">{r.manOfTheMatch}</span>
                      </p>
                    )}

                    {catRatings && (
                      <div className="mt-4 grid grid-cols-2 gap-x-6 gap-y-1.5 border-t border-[var(--border)] pt-4 sm:grid-cols-5">
                        {[
                          { key: "tacticalLevel", label: "Taktik" },
                          { key: "excitement",    label: "Heyecan" },
                          { key: "tempo",         label: "Tempo" },
                          { key: "atmosphere",    label: "Atmosfer" },
                          { key: "referee",       label: "Hakem" },
                        ].map(({ key, label }) => (
                          <div key={key} className="flex flex-col gap-0.5">
                            <span className="text-xs text-[var(--muted)]">{label}</span>
                            <div className="flex items-center gap-1.5">
                              <div className="h-1 flex-1 overflow-hidden rounded-full bg-[var(--border)]">
                                <div
                                  className="h-full rounded-full bg-[var(--stadium-green)]"
                                  style={{ width: `${(catRatings[key] / 10) * 100}%` }}
                                />
                              </div>
                              <span className="text-xs font-semibold text-[var(--foreground)]">
                                {catRatings[key]}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
