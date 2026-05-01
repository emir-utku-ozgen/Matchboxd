"use server";

import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

async function assertOwner(reviewId: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) throw new Error("Bu işlem için giriş yapmanız gerekiyor.");

  const review = await prisma.review.findUnique({
    where: { id: reviewId },
    select: { userId: true, matchId: true },
  });
  if (!review) throw new Error("Analiz bulunamadı.");

  const isOwner = review.userId === session.user.id;
  const isAdmin = session.user.role === "admin";
  if (!isOwner && !isAdmin) throw new Error("Bu analizi yönetme yetkiniz yok.");

  return { review, session };
}

/** Analizi siler, /my-reviews ve ilgili maç sayfasını yeniler. */
export async function deleteMyReview(reviewId: string): Promise<void> {
  const { review } = await assertOwner(reviewId);
  await prisma.review.delete({ where: { id: reviewId } });
  revalidatePath("/my-reviews");
  revalidatePath(`/matches/${review.matchId}`);
}
