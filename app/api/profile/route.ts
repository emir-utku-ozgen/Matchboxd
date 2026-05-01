import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/db";
import { authOptions } from "@/lib/auth";

export async function PATCH(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Giriş gerekli" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { favoriteTeam } = body;

    await prisma.user.update({
      where: { id: session.user.id },
      data: {
        favoriteTeam:
          typeof favoriteTeam === "string"
            ? favoriteTeam.trim() || null
            : null,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Güncellenemedi" },
      { status: 500 }
    );
  }
}
