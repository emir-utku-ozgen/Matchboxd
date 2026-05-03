import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { Prisma } from "@prisma/client";

const DEFAULT_LIMIT = 20;
const MAX_LIMIT     = 100;

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;

    const query     = searchParams.get("query")?.trim()     ?? "";
    const competition = searchParams.get("competition")?.trim() ?? "";
    const season    = searchParams.get("season")?.trim()    ?? "";
    const formation = searchParams.get("formation")?.trim() ?? "";
    const page      = Math.max(1, parseInt(searchParams.get("page")  ?? "1",  10));
    const limit     = Math.min(MAX_LIMIT, Math.max(1, parseInt(searchParams.get("limit") ?? String(DEFAULT_LIMIT), 10)));
    const skip      = (page - 1) * limit;

    // ── Dinamik WHERE bloğu ──────────────────────────────────────────────
    const conditions: Prisma.MatchWhereInput[] = [];

    if (query) {
      conditions.push({
        OR: [
          { homeTeamName: { contains: query } },
          { awayTeamName: { contains: query } },
        ],
      });
    }

    if (competition) {
      conditions.push({ competition });
    }

    if (season) {
      conditions.push({ season });
    }

    // Formation, statsJson içindeki JSON alanından kontrol edilir.
    // JSON.stringify çıktısı boşluksuz: {"homeFormation":"4-3-3",...}
    if (formation) {
      conditions.push({
        OR: [
          { statsJson: { contains: `"homeFormation":"${formation}"` } },
          { statsJson: { contains: `"awayFormation":"${formation}"` } },
        ],
      });
    }

    const where: Prisma.MatchWhereInput =
      conditions.length > 0 ? { AND: conditions } : {};

    // ── Sorgu (paralel) ──────────────────────────────────────────────────
    const [matches, total] = await prisma.$transaction([
      prisma.match.findMany({
        where,
        orderBy: { matchDate: "desc" },
        skip,
        take: limit,
        select: {
          id:           true,
          externalId:   true,
          homeTeamName: true,
          awayTeamName: true,
          homeCrest:    true,
          awayCrest:    true,
          homeScore:    true,
          awayScore:    true,
          competition:  true,
          season:       true,
          matchDate:    true,
          venue:        true,
          status:       true,
          statsJson:    true,
        },
      }),
      prisma.match.count({ where }),
    ]);

    return NextResponse.json({
      matches,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (e) {
    console.error("[GET /api/matches]", e);
    return NextResponse.json(
      { error: "Maçlar yüklenemedi" },
      { status: 500 }
    );
  }
}
