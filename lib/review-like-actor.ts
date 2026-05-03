import { cookies } from "next/headers";
import type { NextResponse } from "next/server";
import type { Session } from "next-auth";

/** Oturum veya misafir çerezi ile analiz beğenisinde tek aktör kimliği */
export const REVIEW_GUEST_COOKIE = "mb_review_guest";

export async function resolveReviewActorKey(session: Session | null): Promise<{
  actorKey: string;
  guestCookieValue?: string;
}> {
  const uid = session?.user?.id;
  if (uid) {
    return { actorKey: `u:${uid}` };
  }

  const jar = await cookies();
  let guest = jar.get(REVIEW_GUEST_COOKIE)?.value?.trim();
  if (!guest || guest.length < 8) {
    guest = crypto.randomUUID();
    return { actorKey: `g:${guest}`, guestCookieValue: guest };
  }
  return { actorKey: `g:${guest}` };
}

export function attachGuestCookie(res: NextResponse, guestValue: string) {
  res.cookies.set(REVIEW_GUEST_COOKIE, guestValue, {
    httpOnly: true,
    path: "/",
    maxAge: 60 * 60 * 24 * 400,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
}
