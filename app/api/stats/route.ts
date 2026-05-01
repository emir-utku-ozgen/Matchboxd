/**
 * GET /api/stats         — Genel istatistikler (MOTM, en iyi maçlar)
 * GET /api/stats?me=true — Kişiselleştirilmiş rapor (oturum gerekli)
 */
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getStatsReport } from "@/lib/stats";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const wantsPersonal = searchParams.get("me") === "true";

    let userId: string | undefined;
    if (wantsPersonal) {
      const session = await getServerSession(authOptions);
      userId = session?.user?.id ?? undefined;
    }

    const report = await getStatsReport(userId);
    return NextResponse.json(report);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "İstatistikler yüklenemedi" }, { status: 500 });
  }
}
