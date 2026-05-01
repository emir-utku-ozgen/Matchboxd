/**
 * GET  /api/collections  — Oturumdaki kullanıcının koleksiyonlarını listeler.
 *                          İlk çağrıda varsayılan koleksiyonları otomatik oluşturur.
 * POST /api/collections  — Yeni CUSTOM koleksiyon oluşturur.
 */
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/db";
import { authOptions } from "@/lib/auth";
import { DEFAULT_COLLECTION_NAMES, DEFAULT_COLLECTION_ORDER } from "@/lib/schema";

async function ensureDefaultCollections(userId: string) {
  const systemTypes = DEFAULT_COLLECTION_ORDER;

  const existing = await prisma.collection.findMany({
    where: { userId, type: { in: systemTypes } },
    select: { type: true },
  });
  const existingTypes = new Set(existing.map((c) => c.type));

  const toCreate = systemTypes.filter((t) => !existingTypes.has(t));
  if (toCreate.length === 0) return;

  await prisma.collection.createMany({
    data: toCreate.map((type) => ({
      userId,
      type,
      name: DEFAULT_COLLECTION_NAMES[type as keyof typeof DEFAULT_COLLECTION_NAMES],
      isPublic: false,
    })),
  });
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Koleksiyonları görmek için giriş yapmalısınız." },
        { status: 401 }
      );
    }

    await ensureDefaultCollections(session.user.id);

    const collections = await prisma.collection.findMany({
      where: { userId: session.user.id },
      include: {
        matches: {
          include: {
            match: {
              select: {
                id: true,
                homeTeamName: true,
                awayTeamName: true,
                homeScore: true,
                awayScore: true,
                competition: true,
                matchDate: true,
                homeCrest: true,
                awayCrest: true,
              },
            },
          },
          orderBy: { addedAt: "desc" },
        },
      },
      orderBy: [{ createdAt: "asc" }],
    });

    // Sistem koleksiyonlarını önce, CUSTOM'ları sona koy
    const ordered = [
      ...collections.filter((c) => c.type !== "CUSTOM"),
      ...collections.filter((c) => c.type === "CUSTOM"),
    ];

    return NextResponse.json(ordered);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Koleksiyonlar yüklenemedi" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Koleksiyon oluşturmak için giriş yapmalısınız." },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { name, description, isPublic } = body as {
      name: string;
      description?: string;
      isPublic?: boolean;
    };

    if (!name?.trim()) {
      return NextResponse.json(
        { error: "Koleksiyon adı zorunludur." },
        { status: 400 }
      );
    }

    const collection = await prisma.collection.create({
      data: {
        userId:      session.user.id,
        name:        name.trim(),
        description: description?.trim() || null,
        isPublic:    isPublic ?? true,
        type:        "CUSTOM",
      },
      // GET endpoint ile aynı include yapısı — istemci tipiyle tutarlı
      include: {
        matches: {
          include: {
            match: {
              select: {
                id: true,
                homeTeamName: true,
                awayTeamName: true,
                homeScore: true,
                awayScore: true,
                competition: true,
                matchDate: true,
                homeCrest: true,
                awayCrest: true,
              },
            },
          },
          orderBy: { addedAt: "desc" },
        },
      },
    });

    return NextResponse.json(collection, { status: 201 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Koleksiyon oluşturulamadı" }, { status: 500 });
  }
}
