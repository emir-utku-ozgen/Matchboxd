import Link from "next/link";
import { prisma } from "@/lib/db";
import TeamFilter from "./TeamFilter";
import ReviewFormToggle from "./ReviewFormToggle";
import { MessageSquare } from "lucide-react";

export const dynamic = "force-dynamic";

// ─── Puan rozet sınıfı ───────────────────────────────────────────────────────

function ratingBadgeClass(r: number) {
  if (r >= 8) return "bg-[var(--stadium-green-muted)] text-[var(--stadium-green)]";
  if (r >= 5) return "bg-amber-400/10 text-amber-400";
  return "bg-red-400/10 text-red-400";
}

// ─── Sayfa ───────────────────────────────────────────────────────────────────

type Props = {
  searchParams: Promise<{ team?: string }>;
};

export default async function ReviewsPage({ searchParams }: Props) {
  const { team } = await searchParams;

  // Tüm benzersiz takım isimlerini çek (filtre dropdown için)
  const [homeTeamRows, awayTeamRows] = await Promise.all([
    prisma.match.findMany({ select: { homeTeamName: true }, distinct: ["homeTeamName"] }),
    prisma.match.findMany({ select: { awayTeamName: true }, distinct: ["awayTeamName"] }),
  ]);
  const teams = [
    ...new Set([
      ...homeTeamRows.map((m) => m.homeTeamName),
      ...awayTeamRows.map((m) => m.awayTeamName),
    ]),
  ].sort((a, b) => a.localeCompare(b, "tr"));

  // Analizleri çek — takım filtresi varsa OR koşuluyla, yoksa tümü (max 80)
  const reviews = await prisma.review.findMany({
    where: team
      ? {
          match: {
            OR: [
              { homeTeamName: team },
              { awayTeamName: team },
            ],
          },
        }
      : undefined,
    orderBy: { createdAt: "desc" },
    take:    80,
    include: {
      match: {
        select: {
          id:           true,
          homeTeamName: true,
          awayTeamName: true,
          homeScore:    true,
          awayScore:    true,
          competition:  true,
          matchDate:    true,
        },
      },
      user: { select: { id: true, name: true } },
    },
  });

  return (
    <div className="min-h-screen bg-[var(--background)]">
      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">

        {/* ── Başlık ────────────────────────────────────────────────────── */}
        <div className="mb-8">
          <h1 className="mb-1 text-3xl font-bold text-[var(--foreground)]">
            Analiz Akışı
          </h1>
          <p className="text-sm text-[var(--muted)]">
            Platforma paylaşılan tüm teknik yorumlar.
          </p>
        </div>

        {/* ── Filtre ────────────────────────────────────────────────────── */}
        <div className="mb-6">
          <TeamFilter teams={teams} selectedTeam={team} />
        </div>

        {/* ── Yeni Analiz Yaz — Accordion ───────────────────────────────── */}
        <div className="mb-10">
          <ReviewFormToggle />
        </div>

        {/* ── Analiz Akışı ──────────────────────────────────────────────── */}
        <section>
          {/* Bölüm başlığı */}
          <div className="mb-5 flex items-center gap-2.5">
            <MessageSquare className="h-5 w-5 text-[var(--stadium-green)]" />
            <h2 className="text-xl font-bold text-[var(--foreground)]">
              {team ? `${team} Analizleri` : "Tüm Analizler"}
            </h2>
            {reviews.length > 0 && (
              <span className="rounded-full bg-[var(--stadium-green-muted)] px-2.5 py-0.5 text-xs font-semibold text-[var(--stadium-green)]">
                {reviews.length}
              </span>
            )}
          </div>

          {/* ── Boş Durum ─────────────────────────────────────────────── */}
          {reviews.length === 0 && (
            <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-[var(--stadium-green)]/20 bg-[var(--stadium-green-muted)]/30 py-16 text-center">
              <span className="text-5xl">⚽</span>
              <div>
                <p className="text-base font-semibold text-[var(--foreground)]">
                  {team
                    ? `Bu takım için henüz analiz yazılmamış.`
                    : "Henüz hiç analiz paylaşılmamış."}
                </p>
                <p className="mt-1 text-sm text-[var(--stadium-green)]">
                  İlk sen yaz ve tartışmayı başlat! ⚽
                </p>
              </div>
            </div>
          )}

          {/* ── Kart Listesi ──────────────────────────────────────────── */}
          {reviews.length > 0 && (
            <div className="space-y-4">
              {reviews.map((r) => {
                const authorName = r.user?.name ?? r.userName;

                return (
                  <article
                    key={r.id}
                    className="group rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] p-5 transition-colors hover:border-[var(--stadium-green)]/25"
                  >
                    {/* Üst satır: Maç ismi + Puan */}
                    <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        {/* Maç linki */}
                        <Link
                          href={`/matches/${r.match.id}`}
                          className="inline-flex flex-wrap items-baseline gap-x-1.5 text-sm font-bold text-[var(--foreground)] hover:text-[var(--stadium-green)]"
                        >
                          <span>{r.match.homeTeamName}</span>
                          <span className="tabular-nums text-[var(--stadium-green)]">
                            {r.match.homeScore}–{r.match.awayScore}
                          </span>
                          <span>{r.match.awayTeamName}</span>
                        </Link>

                        {/* Meta bilgi */}
                        <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-[var(--muted)]">
                          <span className="rounded-full bg-[var(--stadium-green-muted)] px-2 py-0.5 text-[10px] text-[var(--stadium-green)]">
                            {r.match.competition}
                          </span>
                          <span>·</span>
                          {/* Yazar */}
                          {r.user ? (
                            <Link
                              href={`/profile/${r.user.id}`}
                              className="font-medium text-[var(--foreground)] hover:text-[var(--stadium-green)]"
                            >
                              {authorName}
                            </Link>
                          ) : (
                            <span className="font-medium text-[var(--foreground)]">
                              {authorName}
                            </span>
                          )}
                          <span>·</span>
                          <time dateTime={new Date(r.createdAt).toISOString()}>
                            {new Date(r.createdAt).toLocaleDateString("tr-TR", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })}
                          </time>
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

                      {/* Puan rozetleri */}
                      <div className="flex shrink-0 items-center gap-2">
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
                    </div>

                    {/* Analiz başlığı */}
                    {r.title && (
                      <h3 className="mb-1.5 font-semibold text-[var(--foreground)]">
                        {r.title}
                      </h3>
                    )}

                    {/* İçerik — 3 satır limit */}
                    <p className="line-clamp-3 text-sm leading-relaxed text-[var(--muted)]">
                      {r.content}
                    </p>

                    {/* Alt satır: motm + "Tümünü Oku" */}
                    <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                      {r.manOfTheMatch ? (
                        <p className="text-xs text-[var(--muted)]">
                          🏅{" "}
                          <span className="font-medium text-[var(--foreground)]">
                            {r.manOfTheMatch}
                          </span>
                        </p>
                      ) : (
                        <span />
                      )}

                      <Link
                        href={`/matches/${r.match.id}`}
                        className="text-xs font-medium text-[var(--stadium-green)] opacity-0 transition-opacity group-hover:opacity-100 hover:underline"
                      >
                        Tümünü oku →
                      </Link>
                    </div>
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
