"use server";

/**
 * Admin Server Actions
 * Her aksiyon önce oturumu ve rolü doğrular — middleware/layout'a ek olarak
 * sunucu tarafında da yetki kontrolü sağlar (Defense in Depth).
 */

import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

// ─── Yardımcı: Admin kontrolü ────────────────────────────────────────────────

async function assertAdmin() {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "admin") {
    throw new Error("Bu işlem için yönetici yetkisi gerekiyor.");
  }
}

// ─── Kullanıcı Silme ─────────────────────────────────────────────────────────

/**
 * Kullanıcıyı ve ona ait tüm analizleri siler.
 *
 * Prisma schema'da Review.userId onDelete: SetNull tanımlı olduğundan
 * cascade otomatik gerçekleşmez. Bu yüzden önce reviewlar manuel siliniyor.
 * Collection → CollectionMatch onDelete: Cascade olduğundan user.delete()
 * yeterli (koleksiyonlar ve içindeki maçlar otomatik temizlenir).
 */
export async function deleteUser(userId: string): Promise<void> {
  await assertAdmin();

  if (!userId) throw new Error("userId zorunludur.");

  // env-admin sanal hesabı silinemesin (DB kaydı yok)
  if (userId === "env-admin") {
    throw new Error("Bu sistem hesabı silinemez.");
  }

  // 1. Önce bağlı analizleri sil
  await prisma.review.deleteMany({ where: { userId } });

  // 2. Kullanıcıyı sil (Collection → CollectionMatch cascade ile temizlenir)
  await prisma.user.delete({ where: { id: userId } });

  revalidatePath("/admin");
}

// ─── Analiz Silme ─────────────────────────────────────────────────────────────

/**
 * Tek bir analizi moderasyon amacıyla siler.
 */
export async function deleteReview(reviewId: string): Promise<void> {
  await assertAdmin();

  if (!reviewId) throw new Error("reviewId zorunludur.");

  await prisma.review.delete({ where: { id: reviewId } });

  revalidatePath("/admin");
}

