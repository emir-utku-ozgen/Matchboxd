import { notFound } from "next/navigation";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/db";
import { authOptions } from "@/lib/auth";
import RatingStars from "@/components/RatingStars";
import ProfileFavoriteTeam from "@/components/ProfileFavoriteTeam";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ userId: string }> };

export default async function ProfilePage({ params }: Props) {
  const { userId } = await params;
  const session = await getServerSession(authOptions);

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      reviews: {
        orderBy: { createdAt: "desc" },
        include: { match: true },
      },
    },
  });

  if (!user) notFound();

  const avgRating =
    user.reviews.length > 0
      ? user.reviews.reduce((s, r) => s + r.rating, 0) / user.reviews.length
      : 0;

  return (
    <div className="min-h-screen bg-[var(--background)]">
      <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
        {/* Profil kartı */}
        <div className="mb-10 rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] p-8 shadow-lg">
          <div className="flex flex-col items-start gap-6 sm:flex-row sm:items-center">
            <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-[var(--stadium-green-muted)] text-4xl">
              {user.avatarUrl ? (
                <img
                  src={user.avatarUrl}
                  alt=""
                  className="h-full w-full rounded-full object-cover"
                />
              ) : (
                <span className="font-bold text-[var(--stadium-green)]">
                  {user.name.charAt(0).toUpperCase()}
                </span>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="text-2xl font-bold text-[var(--foreground)]">
                {user.name}
              </h1>
              <ProfileFavoriteTeam
                userId={user.id}
                currentUserId={session?.user?.id ?? null}
                initialFavoriteTeam={user.favoriteTeam}
              />
              <div className="mt-4 flex flex-wrap gap-6 text-sm">
                <span className="text-[var(--muted)]">
                  <strong className="text-[var(--foreground)]">
                    {user.reviews.length}
                  </strong>{" "}
                  analiz
                </span>
                <span className="text-[var(--muted)]">
                  Ortalama puan:{" "}
                  <strong className="text-[var(--stadium-green)]">
                    {user.reviews.length
                      ? avgRating.toFixed(1)
                      : "—"}
                  </strong>
                </span>
              </div>
              {user.reviews.length > 0 && (
                <div className="mt-3 flex items-center gap-2">
                  <RatingStars rating={avgRating} size="md" />
                  <span className="text-xs text-[var(--muted)]">
                    ({avgRating.toFixed(1)}/10)
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Analizler */}
        <section>
          <h2 className="mb-4 text-lg font-semibold text-[var(--stadium-green)]">
            Analizler
          </h2>
          {user.reviews.length === 0 ? (
            <div className="rounded-xl border border-[var(--border)] bg-[var(--card-bg)] p-10 text-center text-[var(--muted)]">
              Henüz analiz yok.
            </div>
          ) : (
            <ul className="space-y-4">
              {user.reviews.map((r) => (
                <li
                  key={r.id}
                  className="rounded-xl border border-[var(--border)] bg-[var(--card-bg)] p-5 transition-all hover:border-[var(--stadium-green)]/40 hover:shadow-[0_0_20px_rgba(34,197,94,0.08)]"
                >
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <Link
                      href="/matches"
                      className="font-semibold text-[var(--foreground)] hover:text-[var(--stadium-green)]"
                    >
                      {r.match.homeTeamName} {r.match.homeScore} - {r.match.awayScore}{" "}
                      {r.match.awayTeamName}
                    </Link>
                    <span className="rounded bg-[var(--border)] px-2 py-0.5 text-xs text-[var(--muted)]">
                      {r.match.competition}
                    </span>
                  </div>
                  <p className="line-clamp-2 text-sm text-[var(--muted)]">
                    {r.content}
                  </p>
                  <div className="mt-3 flex items-center gap-3">
                    <RatingStars rating={r.rating} size="sm" />
                    <span className="text-xs text-[var(--muted)]">
                      {new Date(r.createdAt).toLocaleDateString("tr-TR")}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
