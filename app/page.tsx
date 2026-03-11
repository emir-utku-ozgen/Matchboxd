import Link from "next/link";
import { prisma } from "@/lib/db";
import RatingStars from "@/components/RatingStars";

export const dynamic = "force-dynamic";

async function getRecentReviews() {
  try {
    return await prisma.review.findMany({
      take: 6,
      orderBy: { createdAt: "desc" },
      include: { match: true, user: true },
    });
  } catch {
    return [];
  }
}

function formatDate(date: Date) {
  const now = new Date();
  const d = new Date(date);
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return "Bugün";
  if (diffDays === 1) return "Dün";
  if (diffDays < 7) return `${diffDays} gün önce`;
  return d.toLocaleDateString("tr-TR");
}

export default async function Home() {
  const reviews = await getRecentReviews();

  return (
    <div className="min-h-screen bg-[var(--background)]">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        {/* Hero */}
        <section className="mb-16 text-center">
          <h1 className="mb-4 text-4xl font-bold tracking-tight text-[var(--foreground)] sm:text-5xl lg:text-6xl">
            Futbolun Teknik Hafızası
          </h1>
          <p className="mx-auto max-w-2xl text-lg text-[var(--muted)]">
            Maçları izle, analiz et, puanla. Stadyum gecesinin hafızası burada.
          </p>
        </section>

        {/* Son Analizler */}
        <section className="mb-12">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-xl font-semibold text-[var(--stadium-green)]">
              Son Analizler
            </h2>
            <Link
              href="/reviews"
              className="text-sm font-medium text-[var(--stadium-green)] hover:underline"
            >
              Tümünü gör →
            </Link>
          </div>
          {reviews.length === 0 ? (
            <div className="rounded-lg border border-[var(--border)] bg-[var(--card-bg)] p-10 text-center text-[var(--muted)]">
              Henüz analiz yapılmadı.{" "}
              <Link href="/reviews" className="text-[var(--stadium-green)] hover:underline">
                İlk analizi sen yaz →
              </Link>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {reviews.map((r) => (
                <article
                  key={r.id}
                  className="rounded-xl border border-[var(--border)] bg-[var(--card-bg)] p-5 shadow-sm transition-all duration-200 hover:border-[var(--stadium-green)]/50 hover:shadow-[0_0_20px_rgba(34,197,94,0.08)]"
                >
                  <div className="mb-2 text-sm text-[var(--muted)]">
                    {formatDate(r.createdAt)}
                  </div>
                  <h3 className="mb-1 font-semibold text-[var(--foreground)]">
                    {r.match.homeTeamName} {r.match.homeScore} - {r.match.awayScore}{" "}
                    {r.match.awayTeamName}
                  </h3>
                  <p className="line-clamp-2 text-sm text-[var(--muted)]">
                    {r.content}
                  </p>
                  {r.manOfTheMatch && (
                    <p className="mt-2 text-xs text-[var(--muted)]">
                      Maçın Adamı: {r.manOfTheMatch}
                    </p>
                  )}
                  <div className="mt-3 flex items-center gap-2">
                    <RatingStars rating={r.rating} size="sm" />
                    <span className="text-xs text-[var(--muted)]">
                      {r.user?.name ?? r.userName} bu maça {r.rating} puan verdi
                      {r.userId && (
                        <>
                          {" · "}
                          <Link
                            href={`/profile/${r.userId}`}
                            className="text-[var(--stadium-green)] hover:underline"
                          >
                            Profil
                          </Link>
                        </>
                      )}
                    </span>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        {/* Popüler Maçlar */}
        <section>
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-xl font-semibold text-[var(--stadium-green)]">
              Popüler Maçlar
            </h2>
            <Link
              href="/matches"
              className="text-sm font-medium text-[var(--stadium-green)] hover:underline"
            >
              Tüm maçlar →
            </Link>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { home: "Galatasaray", away: "Fenerbahçe", score: "2 - 1" },
              { home: "Real Madrid", away: "Barcelona", score: "3 - 2" },
              { home: "Liverpool", away: "Manchester City", score: "1 - 1" },
            ].map((m, i) => (
              <Link
                key={i}
                href="/matches"
                className="block rounded-lg border border-[var(--border)] bg-[var(--card-bg)] p-5 transition-colors hover:border-[var(--stadium-green)]/50"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium text-[var(--foreground)]">
                      {m.home}
                    </div>
                    <div className="truncate text-sm text-[var(--muted)]">
                      {m.away}
                    </div>
                  </div>
                  <span className="shrink-0 text-lg font-bold text-[var(--stadium-green)]">
                    {m.score}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
