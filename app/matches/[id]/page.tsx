import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import ReviewForm from "@/components/ReviewForm";
import AddToCollectionButton from "@/components/AddToCollectionButton";
import LikeButton from "@/components/LikeButton";
import DeleteReviewButton from "./DeleteReviewButton";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

/** "1 Mayıs 2026 · 21:45" — tek satır, gün adı yok */
function formatMatchDateTime(date: Date) {
  const d = new Date(date);
  const datePart = d.toLocaleDateString("tr-TR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const timePart = d.toLocaleTimeString("tr-TR", {
    hour: "2-digit",
    minute: "2-digit",
  });
  return `${datePart} · ${timePart}`;
}

// ─── Yardımcı: Puan rengi ────────────────────────────────────────────────────

function ratingBadgeClass(rating: number) {
  if (rating >= 8) return "bg-[var(--stadium-green-muted)] text-[var(--stadium-green)]";
  if (rating >= 5) return "bg-amber-400/10 text-amber-400";
  return "bg-red-400/10 text-red-400";
}

// ─── Yardımcı: Yazar avatarı ─────────────────────────────────────────────────

function Avatar({ name }: { name: string | null }) {
  const initials = (name ?? "?")
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");

  const colors = [
    "bg-[var(--stadium-green-muted)] text-[var(--stadium-green)]",
    "bg-amber-400/15 text-amber-400",
    "bg-blue-400/15 text-blue-400",
    "bg-purple-400/15 text-purple-400",
    "bg-rose-400/15 text-rose-400",
  ];
  const color = colors[(name?.charCodeAt(0) ?? 0) % colors.length];

  return (
    <div
      aria-hidden
      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold ${color}`}
    >
      {initials || "?"}
    </div>
  );
}

// ─── Sayfa bileşeni ──────────────────────────────────────────────────────────

export default async function MatchDetailPage({ params }: Props) {
  const { id } = await params;

  const [match, session] = await Promise.all([
    prisma.match.findUnique({
      where: { id },
      include: {
        reviews: {
          orderBy: { createdAt: "desc" },
          include: { user: { select: { id: true, name: true } } },
        },
      },
    }),
    getServerSession(authOptions),
  ]);

  if (!match) notFound();

  const currentUserId = session?.user?.id ?? null;

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
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <span className="rounded-full bg-[var(--stadium-green-muted)] px-3 py-1 text-xs font-medium text-[var(--stadium-green)]">
              {match.competition}
            </span>
            <div className="flex flex-wrap items-center gap-3">
              <LikeButton matchId={match.id} initialLikeCount={match.likeCount ?? 0} />
              <time
                dateTime={new Date(match.matchDate).toISOString()}
                className="text-xs text-[var(--muted)]"
              >
                {formatMatchDateTime(match.matchDate)}
              </time>
            </div>
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

        {/* ── Bu Maç İçin Yapılan Analizler ──────────────────────────────── */}
        <section>
          <div className="mb-5 flex items-center justify-between gap-3">
            <h2 className="text-xl font-bold text-[var(--foreground)]">
              Bu Maç İçin Yapılan Analizler
              {match.reviews.length > 0 && (
                <span className="ml-2 text-base font-normal text-[var(--muted)]">
                  ({match.reviews.length})
                </span>
              )}
            </h2>
          </div>

          {match.reviews.length === 0 ? (
            /* ── Boş durum ── */
            <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-[var(--border)] bg-[var(--card-bg)]/50 py-14 text-center">
              <span className="text-4xl">⚽</span>
              <p className="text-base font-medium text-[var(--foreground)]">
                Bu maç için henüz bir analiz paylaşılmadı.
              </p>
              <p className="text-sm text-[var(--muted)]">İlk sen ol!</p>
            </div>
          ) : (
            /* ── Analiz listesi ── */
            <div className="space-y-4">
              {match.reviews.map((r) => {
                const catRatings = r.categoryRatingsJson
                  ? (() => { try { return JSON.parse(r.categoryRatingsJson!); } catch { return null; } })()
                  : null;

                const authorName = r.user?.name ?? r.userName ?? null;
                const isOwner    = currentUserId != null && r.user?.id === currentUserId;

                return (
                  <article
                    key={r.id}
                    className="rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] p-5 transition-colors hover:border-[var(--stadium-green)]/20"
                  >
                    {/* ── Üst satır: Avatar + Yazar + Tarih + Puanlar + Sil ── */}
                    <div className="mb-3 flex flex-wrap items-start gap-3">
                      <Avatar name={authorName} />

                      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                        {/* Yazar + tarih */}
                        <div className="flex flex-wrap items-center gap-2 text-sm">
                          {r.user ? (
                            <Link
                              href={`/profile/${r.user.id}`}
                              className="font-medium text-[var(--foreground)] hover:text-[var(--stadium-green)]"
                            >
                              {authorName}
                            </Link>
                          ) : (
                            <span className="font-medium text-[var(--foreground)]">
                              {authorName ?? "Anonim"}
                            </span>
                          )}
                          <span className="text-[var(--muted)]">·</span>
                          <time
                            dateTime={new Date(r.createdAt).toISOString()}
                            className="text-xs text-[var(--muted)]"
                          >
                            {new Date(r.createdAt).toLocaleDateString("tr-TR", {
                              day: "numeric",
                              month: "long",
                              year: "numeric",
                            })}
                          </time>
                          {r.formation && (
                            <>
                              <span className="text-[var(--muted)]">·</span>
                              <span className="rounded bg-[var(--background)] px-1.5 py-0.5 font-mono text-xs text-[var(--muted)]">
                                {r.formation}
                              </span>
                            </>
                          )}
                        </div>

                        {/* Analiz başlığı */}
                        {r.title && (
                          <h3 className="text-base font-semibold text-[var(--foreground)]">
                            {r.title}
                          </h3>
                        )}
                      </div>

                      {/* Puanlar + Sil butonu */}
                      <div className="flex shrink-0 flex-col items-end gap-2">
                        <div className="flex items-center gap-2">
                          {r.weightedRating != null && (
                            <span className="rounded-full bg-amber-400/10 px-2.5 py-1 text-xs font-semibold text-amber-400">
                              ⚖️ {r.weightedRating.toFixed(1)}
                            </span>
                          )}
                          <span
                            className={`rounded-full px-2.5 py-1 text-xs font-bold ${ratingBadgeClass(r.rating)}`}
                          >
                            ★ {r.rating}
                          </span>
                        </div>

                        {isOwner && (
                          <DeleteReviewButton reviewId={r.id} matchId={match.id} />
                        )}
                      </div>
                    </div>

                    {/* ── Analiz metni ── */}
                    <p className="text-sm leading-relaxed text-[var(--muted)]">
                      {r.content}
                    </p>

                    {/* ── Maçın Adamı ── */}
                    {r.manOfTheMatch && (
                      <p className="mt-3 text-xs text-[var(--muted)]">
                        🏅 Maçın Adamı:{" "}
                        <span className="font-medium text-[var(--foreground)]">
                          {r.manOfTheMatch}
                        </span>
                      </p>
                    )}

                    {/* ── Kategori puanları ── */}
                    {catRatings && (
                      <div className="mt-4 grid grid-cols-2 gap-x-6 gap-y-2 border-t border-[var(--border)] pt-4 sm:grid-cols-5">
                        {[
                          { key: "tacticalLevel", label: "Taktik"   },
                          { key: "excitement",    label: "Heyecan"  },
                          { key: "tempo",         label: "Tempo"    },
                          { key: "atmosphere",    label: "Atmosfer" },
                          { key: "referee",       label: "Hakem"    },
                        ].map(({ key, label }) => (
                          <div key={key} className="flex flex-col gap-1">
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-[var(--muted)]">{label}</span>
                              <span className="text-xs font-semibold text-[var(--foreground)]">
                                {catRatings[key]}
                              </span>
                            </div>
                            <div className="h-1.5 overflow-hidden rounded-full bg-[var(--border)]">
                              <div
                                className="h-full rounded-full bg-[var(--stadium-green)] transition-all"
                                style={{ width: `${(catRatings[key] / 10) * 100}%` }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
