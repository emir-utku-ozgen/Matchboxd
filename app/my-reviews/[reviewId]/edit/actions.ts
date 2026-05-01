"use server";

import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  computeWeightedRating,
  type CategoryRatings,
} from "@/lib/schema";

export type UpdateReviewPayload = {
  title:           string | null;
  content:         string;
  rating:          number;
  formation:       string | null;
  manOfTheMatch:   string | null;
  categoryRatings: CategoryRatings | null;
};

/**
 * Mevcut analizi günceller.
 * Yalnızca analizin sahibi veya admin çağırabilir.
 */
export async function updateReview(
  reviewId: string,
  payload: UpdateReviewPayload
): Promise<{ matchId: string }> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) throw new Error("Bu işlem için giriş yapmanız gerekiyor.");

  const existing = await prisma.review.findUnique({
    where: { id: reviewId },
    select: { userId: true, matchId: true },
  });
  if (!existing) throw new Error("Analiz bulunamadı.");

  const isOwner = existing.userId === session.user.id;
  const isAdmin = session.user.role === "admin";
  if (!isOwner && !isAdmin) throw new Error("Bu analizi düzenleme yetkiniz yok.");

  const weightedRating = payload.categoryRatings
    ? Math.round(computeWeightedRating(payload.categoryRatings) * 10) / 10
    : null;

  await prisma.review.update({
    where: { id: reviewId },
    data: {
      title:               payload.title,
      content:             payload.content,
      rating:              payload.rating,
      formation:           payload.formation,
      manOfTheMatch:       payload.manOfTheMatch,
      categoryRatingsJson: payload.categoryRatings
        ? JSON.stringify(payload.categoryRatings)
        : null,
      weightedRating,
    },
  });

  revalidatePath("/my-reviews");
  revalidatePath(`/matches/${existing.matchId}`);

  return { matchId: existing.matchId };
}
