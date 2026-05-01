/**
 * POST   /api/collections/[id]/matches  — Maç ekle { matchId }
 * DELETE /api/collections/[id]/matches  — Maç çıkar { matchId }
 */
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/db";
import { authOptions } from "@/lib/auth";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: RouteContext) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Giriş yapmalısınız." }, { status: 401 });
    }

    const collection = await prisma.collection.findUnique({ where: { id } });
    if (!collection || collection.userId !== session.user.id) {
      return NextResponse.json({ error: "Koleksiyon bulunamadı." }, { status: 404 });
    }

    const { matchId } = (await request.json()) as { matchId: string };
    if (!matchId) {
      return NextResponse.json({ error: "matchId zorunludur." }, { status: 400 });
    }

    const match = await prisma.match.findUnique({ where: { id: matchId } });
    if (!match) {
      return NextResponse.json({ error: "Maç bulunamadı." }, { status: 404 });
    }

    const item = await prisma.collectionMatch.upsert({
      where: { collectionId_matchId: { collectionId: id, matchId } },
      create: { collectionId: id, matchId },
      update: {},
      include: { match: true },
    });

    return NextResponse.json(item, { status: 201 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Maç eklenemedi" }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: RouteContext) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Giriş yapmalısınız." }, { status: 401 });
    }

    const collection = await prisma.collection.findUnique({ where: { id } });
    if (!collection || collection.userId !== session.user.id) {
      return NextResponse.json({ error: "Koleksiyon bulunamadı." }, { status: 404 });
    }

    const { matchId } = (await request.json()) as { matchId: string };
    if (!matchId) {
      return NextResponse.json({ error: "matchId zorunludur." }, { status: 400 });
    }

    await prisma.collectionMatch.deleteMany({
      where: { collectionId: id, matchId },
    });

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Maç çıkarılamadı" }, { status: 500 });
  }
}
