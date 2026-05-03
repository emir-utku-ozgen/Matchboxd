import { redirect } from "next/navigation";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  FileText,
  Star,
  Trophy,
  TrendingUp,
  PenLine,
  CalendarDays,
} from "lucide-react";
import DeleteMyReviewButton from "./DeleteMyReviewButton";
import ReviewLikeButton from "@/components/ReviewLikeButton";

export const dynamic = "force-dynamic";

// ─── Puan rengi ──────────────────────────────────────────────────────────────

function ratingBadgeClass(r: number) {
  if (r >= 8) return "bg-[var(--stadium-green-muted)] text-[var(--stadium-green)]";
  if (r >= 5) return "bg-amber-400/10 text-amber-400";
  return "bg-red-400/10 text-red-400";
}

// ─── Sayfa ───────────────────────────────────────────────────────────────────

export default async function MyReviewsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login?callbackUrl=/my-reviews");

  const userId = session.user.id;

  const reviews = await prisma.review.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    include: {
      match: {
        select: {
          id: true,
          homeTeamName: true,
          awayTeamName: true,
          homeScore: true,
          awayScore: true,
          competition: true,
          matchDate: true,
        },
      },
    },
  });

  // ── İstatistikler ────────────────────────────────────────────────────────
  const total    = reviews.length;
  const avgRating = total > 0
    ? Math.round((reviews.reduce((s, r) => s + r.rating, 0) / total) * 10) / 10
    : 0;
  const maxRating = total > 0 ? Math.max(...reviews.map((r) => r.rating)) : 0;

  // En çok analiz yapılan lig
  const compMap: Record<string, number> = {};
  reviews.forEach((r) => {
    compMap[r.match.competition] = (compMap[r.match.competition] ?? 0) + 1;
  });
  const topComp = Object.entries(compMap).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

  // ── Boş durum ────────────────────────────────────────────────────────────
  if (total === 0) {
    return (
      <div className="min-h-screen bg-[var(--background)]">
        <div className="mx-auto max-w-3xl px-4 py-20 sm:px-6 lg:px-8">
          <PageHeader name={session.user.name} />
          <div className="mt-12 flex flex-col items-center justify-center gap-5 rounded-2xl border border-dashed border-[var(--border)] bg-[var(--card-bg)]/50 py-20 text-center">
            <span className="text-5xl">⚽</span>
            <div>
              <p className="text-lg font-semibold text-[var(--foreground)]">
                Henüz analiz yapmadın!
              </p>
              <p className="mt-1 text-sm text-[var(--muted)]">
                İlk analizini yapmak için maçlarımıza göz at.
              </p>
            </div>
            <Link
              href="/matches"
              className="mt-2 inline-flex items-center gap-2 rounded-xl bg-[var(--stadium-green)] px-6 py-3 font-medium text-white hover:bg-[var(--stadium-green-hover)]"
            >
              <CalendarDays className="h-4 w-4" />
              Maçları Keşfet
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ── Dolu sayfa ───────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[var(--background)]">
      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
        <PageHeader name={session.user.name} />

        {/* ── İstatistik kartları ─────────────────────────────────────────── */}
        <div className="mt-6 mb-10 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            {
              label: "Toplam Analiz",
              value: total,
              icon: FileText,
              color: "text-[var(--stadium-green)]",
              bg:    "bg-[var(--stadium-green-muted)]",
            },
            {
              label: "Ort. Puan",
              value: avgRating,
              icon: TrendingUp,
              color: "text-amber-400",
              bg:    "bg-amber-400/10",
            },
            {
              label: "En Yüksek Puan",
              value: maxRating,
              icon: Star,
              color: "text-yellow-400",
              bg:    "bg-yellow-400/10",
            },
            {
              label: "En Çok Analiz",
              value: topComp ?? "—",
              icon: Trophy,
              color: "text-blue-400",
              bg:    "bg-blue-400/10",
              small: true,
            },
          ].map(({ label, value, icon: Icon, color, bg, small }) => (
            <div
              key={label}
              className="flex flex-col gap-3 rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] p-4"
            >
              <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${bg} ${color}`}>
                <Icon className="h-4 w-4" />
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-wider text-[var(--muted)]">{label}</p>
                <p className={`mt-0.5 font-bold tabular-nums ${color} ${small ? "text-base leading-snug" : "text-2xl"}`}>
                  {value}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* ── Analiz listesi ─────────────────────────────────────────────── */}
        <h2 className="mb-4 text-lg font-semibold text-[var(--foreground)]">
          Tüm Analizlerim
        </h2>
        <div className="space-y-4">
          {reviews.map((r) => (
            <article
              key={r.id}
              className="group rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] p-5 transition-colors hover:border-[var(--stadium-green)]/20"
            >
              {/* Üst satır: maç + puan */}
              <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
                {/* Maç bilgisi */}
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/matches/${r.match.id}`}
                    className="inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--foreground)] hover:text-[var(--stadium-green)]"
                  >
                    <span>
                      {r.match.homeTeamName}{" "}
                      <span className="text-[var(--stadium-green)]">
                        {r.match.homeScore}–{r.match.awayScore}
                      </span>{" "}
                      {r.match.awayTeamName}
                    </span>
                  </Link>
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-[var(--stadium-green-muted)] px-2 py-0.5 text-[11px] text-[var(--stadium-green)]">
                      {r.match.competition}
                    </span>
                    <span className="text-xs text-[var(--muted)]">
                      {new Date(r.match.matchDate).toLocaleDateString("tr-TR", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </span>
                    <span className="text-[var(--muted)]">·</span>
                    <span className="text-xs text-[var(--muted)]">
                      Analiz:{" "}
                      {new Date(r.createdAt).toLocaleDateString("tr-TR", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </span>
                  </div>
                </div>

                {/* Puan + Aksiyonlar */}
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

              {/* Başlık */}
              {r.title && (
                <h3 className="mb-1.5 font-semibold text-[var(--foreground)]">{r.title}</h3>
              )}

              {/* İçerik özeti */}
              <p className="line-clamp-3 text-sm leading-relaxed text-[var(--muted)]">
                {r.content}
              </p>

              {/* Alt satır: formation + motm + butonlar */}
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--muted)]">
                  {r.formation && (
                    <span className="rounded bg-[var(--background)] px-1.5 py-0.5 font-mono">
                      {r.formation}
                    </span>
                  )}
                  {r.manOfTheMatch && (
                    <span>🏅 {r.manOfTheMatch}</span>
                  )}
                </div>

                {/* Butonlar */}
                <div className="flex flex-wrap items-center gap-2">
                  <ReviewLikeButton reviewId={r.id} initialLikeCount={r.likeCount ?? 0} compact />
                  <Link
                    href={`/my-reviews/${r.id}/edit`}
                    className="inline-flex items-center gap-1.5 rounded-md border border-[var(--border)] px-3 py-1.5 text-xs font-medium text-[var(--muted)] hover:border-[var(--stadium-green)]/50 hover:bg-[var(--stadium-green-muted)] hover:text-[var(--stadium-green)]"
                  >
                    <PenLine className="h-3.5 w-3.5" />
                    Düzenle
                  </Link>
                  <DeleteMyReviewButton reviewId={r.id} />
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Yardımcı bileşen ────────────────────────────────────────────────────────

function PageHeader({ name }: { name: string | null }) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--stadium-green-muted)]">
        <FileText className="h-5 w-5 text-[var(--stadium-green)]" />
      </div>
      <div>
        <h1 className="text-2xl font-bold text-[var(--foreground)]">Analizlerim</h1>
        <p className="text-sm text-[var(--muted)]">{name}</p>
      </div>
    </div>
  );
}
