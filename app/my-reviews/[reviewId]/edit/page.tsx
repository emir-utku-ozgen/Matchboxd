import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { type CategoryRatings } from "@/lib/schema";
import EditReviewForm from "./EditReviewForm";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ reviewId: string }> };

export default async function EditReviewPage({ params }: Props) {
  const { reviewId } = await params;
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) redirect("/login?callbackUrl=/my-reviews");

  const review = await prisma.review.findUnique({
    where: { id: reviewId },
    include: {
      match: {
        select: {
          id: true,
          homeTeamName: true,
          awayTeamName: true,
          homeScore: true,
          awayScore: true,
          competition: true,
        },
      },
    },
  });

  if (!review) notFound();

  // Yalnızca kendi analizi veya admin erişebilir
  const isOwner = review.userId === session.user.id;
  const isAdmin = session.user.role === "admin";
  if (!isOwner && !isAdmin) redirect("/unauthorized");

  // Mevcut kategori puanlarını parse et
  let parsedCatRatings: CategoryRatings | null = null;
  if (review.categoryRatingsJson) {
    try {
      parsedCatRatings = JSON.parse(review.categoryRatingsJson) as CategoryRatings;
    } catch {
      /* geçersiz JSON → null bırak */
    }
  }

  const matchLabel = `${review.match.homeTeamName} ${review.match.homeScore}–${review.match.awayScore} ${review.match.awayTeamName}`;

  return (
    <div className="min-h-screen bg-[var(--background)]">
      <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6 lg:px-8">

        {/* Geri linki */}
        <Link
          href="/my-reviews"
          className="mb-6 inline-flex items-center gap-1.5 text-sm text-[var(--muted)] hover:text-[var(--stadium-green)]"
        >
          ← Analizlerime dön
        </Link>

        <h1 className="mb-2 text-2xl font-bold text-[var(--foreground)]">
          Analizi Düzenle
        </h1>
        <p className="mb-8 text-sm text-[var(--muted)]">
          {review.match.competition} ·{" "}
          <span className="text-[var(--foreground)]">{matchLabel}</span>
        </p>

        <EditReviewForm
          reviewId={reviewId}
          matchLabel={matchLabel}
          initial={{
            title:           review.title,
            content:         review.content,
            rating:          review.rating,
            formation:       review.formation,
            manOfTheMatch:   review.manOfTheMatch,
            categoryRatings: parsedCatRatings,
          }}
        />
      </div>
    </div>
  );
}
