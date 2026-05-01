/**
 * GET    /api/collections/[id]  — Koleksiyon detayı (maçlarla birlikte)
 * PATCH  /api/collections/[id]  — İsim / açıklama / gizlilik güncelle
 * DELETE /api/collections/[id]  — Koleksiyonu sil (yalnızca CUSTOM silinebilir)
 */
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/db";
import { authOptions } from "@/lib/auth";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: RouteContext) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);

    const collection = await prisma.collection.findUnique({
      where: { id },
      include: {
        matches: {
          include: { match: true },
          orderBy: { addedAt: "desc" },
        },
        user: { select: { id: true, name: true } },
      },
    });

    if (!collection) {
      return NextResponse.json({ error: "Koleksiyon bulunamadı." }, { status: 404 });
    }

    // Gizli koleksiyonlar sadece sahibine görünür
    if (!collection.isPublic && collection.userId !== session?.user?.id) {
      return NextResponse.json({ error: "Erişim reddedildi." }, { status: 403 });
    }

    return NextResponse.json(collection);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Koleksiyon yüklenemedi" }, { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: RouteContext) {
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

    const body = await request.json();
    const { name, description, isPublic } = body as {
      name?: string;
      description?: string;
      isPublic?: boolean;
    };

    // Sistem koleksiyonlarının adı değiştirilemez
    if (collection.type !== "CUSTOM" && name && name.trim() !== collection.name) {
      return NextResponse.json(
        { error: "Varsayılan koleksiyonların adı değiştirilemez." },
        { status: 400 }
      );
    }

    const updated = await prisma.collection.update({
      where: { id },
      data: {
        ...(name?.trim() && collection.type === "CUSTOM" ? { name: name.trim() } : {}),
        ...(description !== undefined ? { description: description?.trim() || null } : {}),
        ...(isPublic !== undefined ? { isPublic } : {}),
      },
      include: { matches: { include: { match: true } } },
    });

    return NextResponse.json(updated);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Güncelleme başarısız" }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: RouteContext) {
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

    if (collection.type !== "CUSTOM") {
      return NextResponse.json(
        { error: "Varsayılan koleksiyonlar silinemez." },
        { status: 400 }
      );
    }

    await prisma.collection.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Silme başarısız" }, { status: 500 });
  }
}
