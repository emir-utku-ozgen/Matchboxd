/**
 * Editor Layout — Sunucu Tarafı Yetki Koruması (Defense in Depth)
 *
 * Middleware (Edge) ilk katman; bu layout ikinci katman.
 * "admin" ve "editor" rolleri erişebilir.
 */
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export default async function EditorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  if (!session) redirect("/login?callbackUrl=/editor");

  const role = session.user.role;
  if (role !== "admin" && role !== "editor") redirect("/unauthorized");

  return <>{children}</>;
}
