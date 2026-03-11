import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const matches = await prisma.match.findMany({
      orderBy: { matchDate: "desc" },
    });
    return NextResponse.json(matches);
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Maçlar yüklenemedi" },
      { status: 500 }
    );
  }
}
