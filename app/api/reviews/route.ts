import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/db";
import { authOptions } from "@/lib/auth";
import { computeWeightedRating, type CategoryRatings } from "@/lib/schema";

export async function GET() {
  try {
    const reviews = await prisma.review.findMany({
      take: 6,
      orderBy: { createdAt: "desc" },
      include: { match: true, user: true },
    });
    return NextResponse.json(reviews);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Analizler yüklenemedi" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Analiz yazmak için giriş yapmalısınız." },
        { status: 401 }
      );
    }

    const body = await request.json();
    const {
      matchId,
      title,
      content,
      rating,
      formation,
      manOfTheMatch,
      categoryRatings,
    } = body as {
      matchId: string;
      title?: string;
      content: string;
      rating: number;
      formation?: string;
      manOfTheMatch?: string;
      categoryRatings?: Partial<CategoryRatings>;
    };

    if (!matchId || !content?.trim() || rating == null) {
      return NextResponse.json(
        { error: "Maç, yorum ve puan zorunludur." },
        { status: 400 }
      );
    }

    const r = Number(rating);
    if (r < 1 || r > 10 || !Number.isInteger(r)) {
      return NextResponse.json(
        { error: "Puan 1-10 arası tam sayı olmalıdır." },
        { status: 400 }
      );
    }

    const match = await prisma.match.findUnique({ where: { id: matchId } });
    if (!match) {
      return NextResponse.json({ error: "Geçersiz maç seçimi." }, { status: 400 });
    }

    // Alt kategori puanlarını doğrula ve ağırlıklı ortalamayı hesapla
    let categoryRatingsJson: string | null = null;
    let weightedRating: number | null = null;

    if (categoryRatings && typeof categoryRatings === "object") {
      const keys: (keyof CategoryRatings)[] = [
        "tempo",
        "tacticalLevel",
        "excitement",
        "referee",
        "atmosphere",
      ];
      const allProvided = keys.every(
        (k) => categoryRatings[k] != null && Number(categoryRatings[k]) >= 1 && Number(categoryRatings[k]) <= 10
      );

      if (allProvided) {
        const validated: CategoryRatings = {
          tempo:         Number(categoryRatings.tempo),
          tacticalLevel: Number(categoryRatings.tacticalLevel),
          excitement:    Number(categoryRatings.excitement),
          referee:       Number(categoryRatings.referee),
          atmosphere:    Number(categoryRatings.atmosphere),
        };
        categoryRatingsJson = JSON.stringify(validated);
        weightedRating = Math.round(computeWeightedRating(validated) * 10) / 10;
      }
    }

    const review = await prisma.review.create({
      data: {
        matchId,
        userId:             session.user.id,
        userName:           session.user.name ?? session.user.email ?? "Kullanıcı",
        title:              title?.trim() || null,
        content:            content.trim(),
        rating:             r,
        formation:          formation?.trim() || null,
        manOfTheMatch:      manOfTheMatch?.trim() || null,
        categoryRatingsJson,
        weightedRating,
      },
      include: { match: true, user: true },
    });

    return NextResponse.json(review);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Analiz kaydedilemedi" }, { status: 500 });
  }
}
