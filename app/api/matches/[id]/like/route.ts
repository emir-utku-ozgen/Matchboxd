import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";

type Params = { params: Promise<{ id: string }> };

function schemaDriftMessage(message: string): boolean {
  const m = message.toLowerCase();
  return (
    m.includes("likecount") ||
    (m.includes("column") && m.includes("does not exist")) ||
    m.includes("unknown arg") ||
    m.includes("invalid column")
  );
}

/**
 * Maç beğenisi: likeCount atomik olarak +1 artırılır.
 */
export async function POST(_req: NextRequest, ctx: Params) {
  const { id } = await ctx.params;

  if (!id?.trim()) {
    return NextResponse.json({ error: "Geçersiz maç kimliği" }, { status: 400 });
  }

  try {
    const updated = await prisma.match.update({
      where: { id },
      data: { likeCount: { increment: 1 } },
      select: { likeCount: true },
    });

    const next = updated.likeCount ?? 0;
    return NextResponse.json({ likeCount: next });
  } catch (e: unknown) {
    console.error("[POST /api/matches/[id]/like]", e);

    if (e instanceof Prisma.PrismaClientKnownRequestError) {
      if (e.code === "P2025") {
        return NextResponse.json({ error: "Maç bulunamadı" }, { status: 404 });
      }
      // Şema / kolon uyumsuzluğu vb.
      if (schemaDriftMessage(e.message)) {
        return NextResponse.json(
          {
            error:
              "Veritabanı şeması güncel değil (ör. likeCount kolonu eksik). Ortamda `npx prisma migrate deploy` çalıştırın.",
          },
          { status: 503 },
        );
      }
    }

    const msg = e instanceof Error ? e.message : String(e);
    if (schemaDriftMessage(msg)) {
      return NextResponse.json(
        {
          error:
            "Veritabanı şeması güncel değil (ör. likeCount kolonu eksik). Ortamda `npx prisma migrate deploy` çalıştırın.",
        },
        { status: 503 },
      );
    }

    return NextResponse.json({ error: "Beğeni kaydedilemedi" }, { status: 500 });
  }
}
