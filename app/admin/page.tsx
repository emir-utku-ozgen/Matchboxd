import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { CalendarDays, FileText, Users, Database } from "lucide-react";

export const dynamic = "force-dynamic";

async function getDbStats() {
  const [matchCount, reviewCount, userCount, competitions] = await Promise.all([
    prisma.match.count(),
    prisma.review.count(),
    prisma.user.count(),
    prisma.match.groupBy({
      by: ["competition"],
      _count: { id: true },
      orderBy: { _count: { id: "desc" } },
    }),
  ]);
  return { matchCount, reviewCount, userCount, competitions };
}

export default async function AdminPage() {
  const session = await getServerSession(authOptions);
  const stats   = await getDbStats();

  return (
    <div className="min-h-screen bg-[var(--background)]">
      <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">

        {/* Başlık */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-[var(--foreground)]">Admin Paneli</h1>
          <p className="mt-1 text-[var(--muted)]">
            Veritabanı istatistikleri ve sistem yönetimi.
          </p>
          {session?.user && (
            <p className="mt-1 text-xs text-[var(--muted)]">
              Oturum:{" "}
              <span className="text-[var(--stadium-green)]">{session.user.email}</span>
            </p>
          )}
        </div>

        {/* Özet Kartlar */}
        <section className="mb-8">
          <h2 className="mb-4 text-lg font-semibold text-[var(--stadium-green)]">
            Veritabanı Özeti
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { label: "Toplam Maç",    value: stats.matchCount,  icon: CalendarDays, href: "/matches" },
              { label: "Toplam Analiz", value: stats.reviewCount, icon: FileText,     href: "/reviews" },
              { label: "Kullanıcı",     value: stats.userCount,   icon: Users,        href: null       },
              { label: "Lig / Kategori",value: stats.competitions.length, icon: Database, href: null  },
            ].map(({ label, value, icon: Icon, href }) => {
              const card = (
                <div className="flex items-center gap-4 rounded-xl border border-[var(--border)] bg-[var(--card-bg)] p-5 transition-all hover:border-[var(--stadium-green)]/40">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[var(--stadium-green-muted)] text-[var(--stadium-green)]">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="text-xs text-[var(--muted)]">{label}</div>
                    <div className="text-2xl font-bold text-[var(--stadium-green)]">{value}</div>
                  </div>
                </div>
              );
              return href ? <Link key={label} href={href}>{card}</Link> : <div key={label}>{card}</div>;
            })}
          </div>
        </section>

        {/* Lig / Kategori Dağılımı */}
        {stats.competitions.length > 0 && (
          <section className="mb-8">
            <h2 className="mb-4 text-lg font-semibold text-[var(--stadium-green)]">
              Lig / Kategori Dağılımı
            </h2>
            <div className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--card-bg)]">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--border)] text-xs text-[var(--muted)]">
                    <th className="px-5 py-3 text-left">Lig / Kategori</th>
                    <th className="px-5 py-3 text-right">Maç Sayısı</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {stats.competitions.map((c) => (
                    <tr key={c.competition} className="hover:bg-white/5">
                      <td className="px-5 py-3 font-medium text-[var(--foreground)]">
                        {c.competition}
                      </td>
                      <td className="px-5 py-3 text-right text-[var(--stadium-green)] font-semibold">
                        {c._count.id}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* Seed Rehberi */}
        <section className="mb-8">
          <h2 className="mb-4 text-lg font-semibold text-[var(--stadium-green)]">
            Veritabanını Güncelleme
          </h2>
          <div className="rounded-xl border border-[var(--border)] bg-[var(--card-bg)] p-6">
            <p className="mb-4 text-sm text-[var(--muted)]">
              Bu uygulama <strong className="text-[var(--foreground)]">yerel veritabanını Source of Truth</strong> olarak kullanır.
              Yeni maç eklemek veya mevcut verileri güncellemek için:
            </p>
            <ol className="mb-5 list-inside list-decimal space-y-2 text-sm text-[var(--muted)]">
              <li>
                <code className="rounded bg-[var(--background)] px-1.5 py-0.5 text-xs text-[var(--foreground)]">
                  prisma/real-matches.ts
                </code>{" "}
                dosyasını düzenle — gerçek maç bilgilerini ekle / güncelle.
              </li>
              <li>
                Terminalde{" "}
                <code className="rounded bg-[var(--background)] px-1.5 py-0.5 text-xs text-[var(--foreground)]">
                  npm run db:seed
                </code>{" "}
                komutunu çalıştır.
              </li>
              <li>
                Seed,{" "}
                <code className="rounded bg-[var(--background)] px-1.5 py-0.5 text-xs text-[var(--foreground)]">
                  externalId
                </code>{" "}
                üzerinden <strong className="text-[var(--foreground)]">upsert</strong> yapar — mükerrer kayıt oluşmaz.
              </li>
            </ol>
            <div className="rounded-lg bg-[var(--background)] px-4 py-3 font-mono text-xs text-[var(--stadium-green)]">
              npm run db:seed
            </div>
          </div>
        </section>

        {/* Hızlı Linkler */}
        <section>
          <h2 className="mb-4 text-lg font-semibold text-[var(--stadium-green)]">
            Hızlı Erişim
          </h2>
          <div className="grid gap-3 sm:grid-cols-3">
            {[
              { href: "/matches",     label: "Maç Listesi",   desc: "Tüm maçları görüntüle" },
              { href: "/stats",       label: "İstatistikler", desc: "Analiz raporları"       },
              { href: "/collections", label: "Koleksiyonlar", desc: "Kullanıcı listeleri"    },
            ].map(({ href, label, desc }) => (
              <Link
                key={href}
                href={href}
                className="rounded-xl border border-[var(--border)] bg-[var(--card-bg)] px-5 py-4 transition-all hover:border-[var(--stadium-green)]/50 hover:shadow-[0_0_16px_rgba(34,197,94,0.08)]"
              >
                <div className="font-medium text-[var(--foreground)]">{label}</div>
                <div className="mt-0.5 text-xs text-[var(--muted)]">{desc}</div>
              </Link>
            ))}
          </div>
        </section>

      </div>
    </div>
  );
}
