import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { attachGuestCookie, resolveReviewActorKey } from "@/lib/review-like-actor";

type Params = { params: Promise<{ id: string }> };

async function buildLikePayload(reviewId: string) {
  const session = await getServerSession(authOptions);
  const { actorKey, guestCookieValue } = await resolveReviewActorKey(session);

  const review = await prisma.review.findUnique({
    where: { id: reviewId },
    select: { id: true, likeCount: true },
  });

  if (!review) {
    return { error: "Analiz bulunamadı" as const, status: 404 as const };
  }

  const liked = !!(await prisma.reviewLike.findUnique({
    where: { reviewId_actorKey: { reviewId, actorKey } },
    select: { id: true },
  }));

  return {
    liked,
    likeCount: review.likeCount ?? 0,
    guestCookieValue,
  };
}

/** Mevcut beğeni durumu + sayaç (SSR senkronu ve ilk yükleme için) */
export async function GET(_req: Request, ctx: Params) {
  const { id } = await ctx.params;
  if (!id?.trim()) {
    return NextResponse.json({ error: "Geçersiz analiz kimliği" }, { status: 400 });
  }

  const payload = await buildLikePayload(id);
  if ("error" in payload && payload.error) {
    return NextResponse.json({ error: payload.error }, { status: payload.status });
  }

  const { liked, likeCount, guestCookieValue } = payload;
  const res = NextResponse.json({ liked, likeCount });
  if (guestCookieValue) attachGuestCookie(res, guestCookieValue);
  return res;
}

/** Beğeni ekle / kaldır (toggle) — aktör başına tek kayıt */
export async function POST(_req: Request, ctx: Params) {
  const { id } = await ctx.params;
  if (!id?.trim()) {
    return NextResponse.json({ error: "Geçersiz analiz kimliği" }, { status: 400 });
  }

  const session = await getServerSession(authOptions);
  const { actorKey, guestCookieValue } = await resolveReviewActorKey(session);

  try {
    const result = await prisma.$transaction(async (tx) => {
      const review = await tx.review.findUnique({
        where: { id },
        select: { id: true, likeCount: true },
      });
      if (!review) return null;

      const existing = await tx.reviewLike.findUnique({
        where: { reviewId_actorKey: { reviewId: id, actorKey } },
      });

      if (existing) {
        await tx.reviewLike.delete({ where: { id: existing.id } });
        const next = Math.max(0, (review.likeCount ?? 0) - 1);
        await tx.review.update({
          where: { id },
          data: { likeCount: next },
        });
        return { liked: false, likeCount: next };
      }

      await tx.reviewLike.create({
        data: { reviewId: id, actorKey },
      });
      const next = (review.likeCount ?? 0) + 1;
      await tx.review.update({
        where: { id },
        data: { likeCount: next },
      });
      return { liked: true, likeCount: next };
    });

    if (!result) {
      return NextResponse.json({ error: "Analiz bulunamadı" }, { status: 404 });
    }

    const res = NextResponse.json(result);
    if (guestCookieValue) attachGuestCookie(res, guestCookieValue);
    return res;
  } catch (e) {
    console.error("[POST /api/reviews/[id]/like]", e);
    return NextResponse.json({ error: "Beğeni güncellenemedi" }, { status: 500 });
  }
}
