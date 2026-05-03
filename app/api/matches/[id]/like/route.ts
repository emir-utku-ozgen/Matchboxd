import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

type Params = { params: Promise<{ id: string }> };

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

    return NextResponse.json({ likeCount: updated.likeCount });
  } catch {
    return NextResponse.json({ error: "Maç bulunamadı" }, { status: 404 });
  }
}
