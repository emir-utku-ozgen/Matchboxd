import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getStatsReport } from "@/lib/stats";

export const dynamic = "force-dynamic";

function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--card-bg)] px-6 py-10 text-center text-sm text-[var(--muted)]">
      {message}
    </div>
  );
}

function RatingBar({ value, max = 10 }: { value: number; max?: number }) {
  return (
    <div className="flex items-center gap-2">
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-[var(--border)]">
        <div
          className="h-full rounded-full bg-[var(--stadium-green)] transition-all"
          style={{ width: `${(value / max) * 100}%` }}
        />
      </div>
      <span className="w-8 text-right text-xs font-semibold text-[var(--stadium-green)]">
        {value.toFixed(1)}
      </span>
    </div>
  );
}

export default async function StatsPage() {
  const session = await getServerSession(authOptions);
  const report  = await getStatsReport(session?.user?.id ?? undefined);

  return (
    <div className="min-h-screen bg-[var(--background)]">
      <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">

        <h1 className="mb-2 text-3xl font-bold text-[var(--foreground)]">İstatistikler</h1>
        <p className="mb-10 text-[var(--muted)]">
          Platform genelinde üretilen analiz verileri ve sıralamalar.
        </p>

        <div className="grid gap-8 lg:grid-cols-2">

          {/* Son 1 ayın en yüksek puanlı maçları */}
          <section className="lg:col-span-2">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-[var(--stadium-green)]">
                🏆 Son 30 Günün En Yüksek Puanlı Maçları
              </h2>
              <span className="text-xs text-[var(--muted)]">Ağırlıklı puana göre</span>
            </div>

            {report.topMatchesLastMonth.length === 0 ? (
              <EmptyState message="Son 30 gün içinde analiz girilen maç bulunamadı." />
            ) : (
              <div className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--card-bg)]">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[var(--border)] text-left text-xs text-[var(--muted)]">
                      <th className="px-4 py-3">#</th>
                      <th className="px-4 py-3">Maç</th>
                      <th className="hidden px-4 py-3 sm:table-cell">Lig</th>
                      <th className="px-4 py-3 text-right">Analiz</th>
                      <th className="px-4 py-3 text-right">Genel</th>
                      <th className="px-4 py-3 text-right">Ağırlıklı</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border)]">
                    {report.topMatchesLastMonth.map((m, i) => (
                      <tr key={m.matchId} className="hover:bg-white/5">
                        <td className="px-4 py-3 font-bold text-[var(--muted)]">{i + 1}</td>
                        <td className="px-4 py-3">
                          <Link
                            href={`/matches/${m.matchId}`}
                            className="font-medium text-[var(--foreground)] hover:text-[var(--stadium-green)]"
                          >
                            {m.homeTeamName}{" "}
                            <span className="font-bold text-[var(--stadium-green)]">
                              {m.homeScore}–{m.awayScore}
                            </span>{" "}
                            {m.awayTeamName}
                          </Link>
                        </td>
                        <td className="hidden px-4 py-3 text-[var(--muted)] sm:table-cell">
                          {m.competition}
                        </td>
                        <td className="px-4 py-3 text-right text-[var(--muted)]">
                          {m.reviewCount}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className="font-semibold text-[var(--foreground)]">
                            {m.avgRating.toFixed(1)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          {m.avgWeightedRating != null ? (
                            <span className="font-bold text-yellow-400">
                              {m.avgWeightedRating.toFixed(1)}
                            </span>
                          ) : (
                            <span className="text-[var(--muted)]">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* Maçın Adamı lider tablosu */}
          <section>
            <h2 className="mb-4 text-lg font-semibold text-[var(--stadium-green)]">
              🏅 Maçın Adamı Lider Tablosu
            </h2>

            {report.topMotmPlayers.length === 0 ? (
              <EmptyState message="Henüz Maçın Adamı seçilmemiş." />
            ) : (
              <div className="rounded-xl border border-[var(--border)] bg-[var(--card-bg)] p-5">
                <ol className="space-y-3">
                  {report.topMotmPlayers.map((p, i) => (
                    <li key={p.playerName} className="flex items-center gap-3">
                      <span
                        className={`w-6 text-center text-sm font-bold ${
                          i === 0
                            ? "text-yellow-400"
                            : i === 1
                            ? "text-gray-300"
                            : i === 2
                            ? "text-amber-600"
                            : "text-[var(--muted)]"
                        }`}
                      >
                        {i + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className="truncate font-medium text-[var(--foreground)]">
                            {p.playerName}
                          </span>
                          <span className="shrink-0 text-xs text-[var(--muted)]">
                            {p.count}×
                          </span>
                        </div>
                        <RatingBar
                          value={p.count}
                          max={report.topMotmPlayers[0]?.count ?? 1}
                        />
                      </div>
                    </li>
                  ))}
                </ol>
              </div>
            )}
          </section>

          {/* Kişisel lig istatistiği */}
          <section>
            <h2 className="mb-4 text-lg font-semibold text-[var(--stadium-green)]">
              📊 Senin Analiz Profili
            </h2>

            {!session ? (
              <div className="rounded-xl border border-[var(--border)] bg-[var(--card-bg)] px-6 py-10 text-center">
                <p className="mb-4 text-sm text-[var(--muted)]">
                  Kişisel istatistiklerini görmek için giriş yapmalısın.
                </p>
                <Link
                  href="/login"
                  className="inline-block rounded-lg bg-[var(--stadium-green)] px-5 py-2.5 text-sm font-medium text-white hover:bg-[var(--stadium-green-hover)]"
                >
                  Giriş Yap
                </Link>
              </div>
            ) : report.userLeagueStat === null ? (
              <EmptyState message="Henüz analiz yazmadın. İlk analizi yaz ve burada istatistiklerini gör." />
            ) : (
              <div className="rounded-xl border border-[var(--border)] bg-[var(--card-bg)] p-5">
                <div className="space-y-5">
                  <div className="flex items-start gap-4 rounded-lg bg-[var(--stadium-green-muted)] p-4">
                    <span className="text-3xl">🏆</span>
                    <div>
                      <p className="text-xs text-[var(--muted)]">En çok analiz ettiğin lig</p>
                      <p className="mt-0.5 text-lg font-bold text-[var(--stadium-green)]">
                        {report.userLeagueStat.topLeague}
                      </p>
                      <p className="text-xs text-[var(--muted)]">
                        {report.userLeagueStat.reviewCountInLeague} analiz
                      </p>
                    </div>
                  </div>

                  {report.userLeagueStat.favoriteTeamInLeague && (
                    <div className="flex items-start gap-4 rounded-lg bg-[var(--card-bg)] p-4 ring-1 ring-[var(--border)]">
                      <span className="text-3xl">⭐</span>
                      <div>
                        <p className="text-xs text-[var(--muted)]">
                          Bu ligdeki favori takımın
                        </p>
                        <p className="mt-0.5 text-lg font-bold text-[var(--foreground)]">
                          {report.userLeagueStat.favoriteTeamInLeague}
                        </p>
                        <p className="text-xs text-[var(--muted)]">
                          {report.userLeagueStat.favoriteTeamReviewCount} maç analizi
                        </p>
                      </div>
                    </div>
                  )}

                  <Link
                    href={`/profile/${session.user.id}`}
                    className="block text-center text-sm text-[var(--stadium-green)] hover:underline"
                  >
                    Tüm profilini gör →
                  </Link>
                </div>
              </div>
            )}
          </section>

        </div>
      </div>
    </div>
  );
}
