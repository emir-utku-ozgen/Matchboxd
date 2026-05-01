import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// Sık değişmeyen meta veriler — 10 dakika önbelleğe al
export const revalidate = 600;

export async function GET() {
  try {
    // Prisma groupBy ile benzersiz competition ve season değerlerini çek
    const [compGroups, seasonGroups] = await prisma.$transaction([
      prisma.match.groupBy({ by: ["competition"], orderBy: { competition: "asc" } }),
      prisma.match.groupBy({ by: ["season"],      orderBy: { season: "asc" }      }),
    ]);

    const competitions = compGroups
      .map((g) => g.competition)
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b, "tr"));

    // Sezonları "2025-26 → 2010-11" sırasına koy (yeniden eskiye)
    const seasons = seasonGroups
      .map((g) => g.season)
      .filter(Boolean)
      .sort((a, b) => b.localeCompare(a));

    return NextResponse.json({ competitions, seasons });
  } catch (e) {
    console.error("[GET /api/matches/filters]", e);
    return NextResponse.json({ competitions: [], seasons: [] }, { status: 500 });
  }
}
