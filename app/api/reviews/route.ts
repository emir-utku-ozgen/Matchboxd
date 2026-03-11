import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/db";
import { authOptions } from "@/lib/auth";

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
    return NextResponse.json(
      { error: "Analizler yüklenemedi" },
      { status: 500 }
    );
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
    const { matchId, title, content, rating, manOfTheMatch } = body;

    if (!matchId || content == null || content.trim() === "" || rating == null) {
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
      return NextResponse.json(
        { error: "Geçersiz maç seçimi." },
        { status: 400 }
      );
    }

    const review = await prisma.review.create({
      data: {
        matchId,
        userId: session.user.id,
        userName: session.user.name ?? session.user.email ?? "Kullanıcı",
        title: title?.trim() || null,
        content: content.trim(),
        rating: r,
        manOfTheMatch: manOfTheMatch?.trim() || null,
      },
      include: { match: true, user: true },
    });

    return NextResponse.json(review);
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Analiz kaydedilemedi" },
      { status: 500 }
    );
  }
}
