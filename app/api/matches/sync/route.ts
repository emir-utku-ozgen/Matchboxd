import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  fetchMatchesFromApi,
  mapApiMatchToDb,
  isFootballDataConfigured,
} from "@/lib/football-data";

/**
 * POST /api/matches/sync
 * Football-Data.org API'den maçları çeker, veritabanında yoksa ekler.
 */
export async function POST() {
  if (!isFootballDataConfigured()) {
    return NextResponse.json(
      {
        error: "API anahtarı tanımlı değil. .env dosyasına FOOTBALL_DATA_API_KEY ekleyin.",
        synced: 0,
        added: 0,
      },
      { status: 400 }
    );
  }

  try {
    const apiMatches = await fetchMatchesFromApi();
    let added = 0;

    for (const m of apiMatches) {
      const existing = await prisma.match.findUnique({
        where: { externalId: String(m.id) },
      });
      if (existing) continue;

      const data = mapApiMatchToDb(m);
      await prisma.match.create({
        data: {
          ...data,
          externalId: data.externalId,
        },
      });
      added += 1;
    }

    return NextResponse.json({
      ok: true,
      synced: apiMatches.length,
      added,
      message: `${apiMatches.length} maç kontrol edildi, ${added} yeni maç eklendi.`,
    });
  } catch (e) {
    console.error("[matches/sync]", e);
    return NextResponse.json(
      {
        error: e instanceof Error ? e.message : "Senkronizasyon hatası",
        synced: 0,
        added: 0,
      },
      { status: 500 }
    );
  }
}
