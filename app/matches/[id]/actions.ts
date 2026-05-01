"use server";

import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

/**
 * Analizi siler. Yalnızca analizin sahibi veya admin silebilir.
 * @param reviewId  Silinecek analizin ID'si
 * @param matchId   Sayfayı revalidate etmek için maç ID'si
 */
export async function deleteMatchReview(
  reviewId: string,
  matchId: string
): Promise<void> {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    throw new Error("Bu işlem için giriş yapmanız gerekiyor.");
  }

  const review = await prisma.review.findUnique({
    where: { id: reviewId },
    select: { userId: true },
  });

  if (!review) throw new Error("Analiz bulunamadı.");

  const isOwner = review.userId === session.user.id;
  const isAdmin = session.user.role === "admin";

  if (!isOwner && !isAdmin) {
    throw new Error("Bu analizi silme yetkiniz yok.");
  }

  await prisma.review.delete({ where: { id: reviewId } });
  revalidatePath(`/matches/${matchId}`);
}
