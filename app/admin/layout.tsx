/**
 * Admin Layout — Sunucu Tarafı İkinci Güvenlik Katmanı
 *
 * Middleware (Edge) ilk katmandır; bu layout Server Component olarak
 * ikinci katmanı oluşturur. İki nedeni var:
 *
 *  1. Defense in Depth: Middleware atlatılsa bile (konfigürasyon hatası,
 *     edge cache anomalisi vb.) bu kontrol devreye girer.
 *  2. Session bilgisini alt bileşenlere aktarmak için merkezi yer.
 */

import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  // Oturum yok
  if (!session) {
    redirect("/login?callbackUrl=/admin");
  }

  // Oturum var ama admin rolü yok
  if (session.user.role !== "admin") {
    redirect("/unauthorized");
  }

  return (
    // Admin sayfalarına ince bir sol kenar çubuğu rengi ekleyebilirsiniz.
    // Şimdilik doğrudan children'ı render ediyoruz.
    <>{children}</>
  );
}
