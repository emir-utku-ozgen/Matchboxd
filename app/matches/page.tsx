"use client";

import { useState, useEffect, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";

type Match = {
  id: string;
  externalId: string | null;
  homeTeamName: string;
  awayTeamName: string;
  homeCrest: string | null;
  awayCrest: string | null;
  homeScore: number;
  awayScore: number;
  competition: string;
  matchDate: string;
  venue: string;
  status: string | null;
};

function formatMatchTime(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleTimeString("tr-TR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatMatchDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString("tr-TR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function MatchesPage() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [leagueFilter, setLeagueFilter] = useState<string>("all");

  const competitions = useMemo(() => {
    const set = new Set(matches.map((m) => m.competition).filter(Boolean));
    return Array.from(set).sort();
  }, [matches]);

  const filteredMatches = useMemo(() => {
    if (leagueFilter === "all") return matches;
    return matches.filter((m) => m.competition === leagueFilter);
  }, [matches, leagueFilter]);

  async function loadMatches() {
    setLoading(true);
    try {
      const res = await fetch("/api/matches");
      const data = await res.json();
      setMatches(Array.isArray(data) ? data : []);
    } catch {
      setMatches([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadMatches();
  }, []);

  async function handleSync() {
    setSyncing(true);
    setSyncMessage(null);
    try {
      const res = await fetch("/api/matches/sync", { method: "POST" });
      const data = await res.json();
      if (data.ok) {
        setSyncMessage(data.message ?? "Güncellendi.");
        await loadMatches();
      } else {
        setSyncMessage(data.error ?? "Senkronizasyon başarısız.");
      }
    } catch {
      setSyncMessage("Bağlantı hatası.");
    } finally {
      setSyncing(false);
    }
  }

  return (
    <div className="min-h-screen bg-[var(--background)]">
      <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-[var(--foreground)]">
              Maçlar
            </h1>
            <p className="mt-1 text-[var(--muted)]">
              Güncel maçlar Football-Data.org API ile senkronize edilir.
            </p>
          </div>
          <button
            type="button"
            onClick={handleSync}
            disabled={syncing || loading}
            className="shrink-0 rounded-lg bg-[var(--stadium-green)] px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[var(--stadium-green-hover)] disabled:opacity-50"
          >
            {syncing ? "Güncelleniyor..." : "API'den Güncelle"}
          </button>
        </div>

        {syncMessage && (
          <p className="mb-4 text-sm text-[var(--muted)]">{syncMessage}</p>
        )}

        {/* Lig filtreleri */}
        {!loading && matches.length > 0 && (
          <div className="mb-6 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setLeagueFilter("all")}
              className={`rounded-full px-4 py-2 text-sm font-medium transition-all ${
                leagueFilter === "all"
                  ? "bg-[var(--stadium-green)] text-white shadow-[0_0_12px_rgba(34,197,94,0.3)]"
                  : "border border-[var(--border)] bg-[var(--card-bg)] text-[var(--muted)] hover:border-[var(--stadium-green)]/50 hover:text-[var(--foreground)]"
              }`}
            >
              Tümü
            </button>
            {competitions.map((comp) => (
              <button
                key={comp}
                type="button"
                onClick={() => setLeagueFilter(comp)}
                className={`rounded-full px-4 py-2 text-sm font-medium transition-all ${
                  leagueFilter === comp
                    ? "bg-[var(--stadium-green)] text-white shadow-[0_0_12px_rgba(34,197,94,0.3)]"
                    : "border border-[var(--border)] bg-[var(--card-bg)] text-[var(--muted)] hover:border-[var(--stadium-green)]/50 hover:text-[var(--foreground)]"
                }`}
              >
                {comp}
              </button>
            ))}
          </div>
        )}

        {/* Attribution - API şartı */}
        <p className="mb-6 text-xs text-[var(--muted)]">
          Veri:{" "}
          <a
            href="https://www.football-data.org"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[var(--stadium-green)] hover:underline"
          >
            football-data.org
          </a>
        </p>

        {loading ? (
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] p-12 text-center text-[var(--muted)]">
            Maçlar yükleniyor...
          </div>
        ) : filteredMatches.length === 0 ? (
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] p-12 text-center text-[var(--muted)]">
            <p className="mb-4">
              {matches.length === 0
                ? "Henüz maç yok."
                : "Bu ligde maç bulunamadı."}
            </p>
            {matches.length === 0 && (
              <p className="text-sm">
                &quot;API'den Güncelle&quot; butonuna tıklayın (API anahtarınızı .env
                dosyasına eklediyseniz maçlar gelecektir).
              </p>
            )}
          </div>
        ) : (
          <ul className="space-y-4">
            {filteredMatches.map((m) => (
              <li
                key={m.id}
                className="group flex flex-col rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] p-5 shadow-sm transition-all duration-200 hover:border-[var(--stadium-green)]/50 hover:shadow-[0_0_28px_rgba(34,197,94,0.12)] sm:flex-row sm:items-center sm:gap-6"
              >
                <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
                  <div className="flex w-full items-center justify-between gap-2 sm:w-auto sm:flex-1">
                    <span className="truncate text-left font-medium text-[var(--foreground)] sm:text-right">
                      {m.homeTeamName}
                    </span>
                    <div className="relative h-8 w-8 shrink-0 overflow-hidden rounded-full bg-[var(--background)] ring-1 ring-[var(--border)]">
                      {m.homeCrest ? (
                        <Image
                          src={m.homeCrest}
                          alt=""
                          fill
                          className="object-contain"
                          unoptimized
                          sizes="32px"
                        />
                      ) : (
                        <span className="flex h-full w-full items-center justify-center text-xs text-[var(--muted)]">
                          —
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex min-w-[80px] flex-shrink-0 items-center justify-center gap-2 py-1">
                    <span className="text-xl font-bold tabular-nums text-[var(--foreground)]">
                      {m.homeScore}
                    </span>
                    <span className="text-[var(--muted)]">-</span>
                    <span className="text-xl font-bold tabular-nums text-[var(--foreground)]">
                      {m.awayScore}
                    </span>
                  </div>

                  <div className="flex w-full items-center justify-between gap-2 sm:w-auto sm:flex-1">
                    <div className="relative h-8 w-8 shrink-0 overflow-hidden rounded-full bg-[var(--background)] ring-1 ring-[var(--border)]">
                      {m.awayCrest ? (
                        <Image
                          src={m.awayCrest}
                          alt=""
                          fill
                          className="object-contain"
                          unoptimized
                          sizes="32px"
                        />
                      ) : (
                        <span className="flex h-full w-full items-center justify-center text-xs text-[var(--muted)]">
                          —
                        </span>
                      )}
                    </div>
                    <span className="truncate text-right font-medium text-[var(--foreground)]">
                      {m.awayTeamName}
                    </span>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-3 border-t border-[var(--border)] pt-4 sm:mt-0 sm:border-t-0 sm:pt-0">
                  <div className="text-sm text-[var(--muted)]">
                    <span className="font-medium text-[var(--foreground)]">
                      {formatMatchTime(m.matchDate)}
                    </span>
                    {" · "}
                    {formatMatchDate(m.matchDate)}
                  </div>
                  <span className="rounded-lg bg-[var(--background)] px-2.5 py-1 text-xs text-[var(--muted)]">
                    {m.competition}
                  </span>
                  {m.externalId && (
                    <span className="rounded-lg bg-[var(--stadium-green-muted)] px-2.5 py-1 text-xs font-medium text-[var(--stadium-green)]">
                      API&apos;den canlı çekildi
                    </span>
                  )}
                  <Link
                    href={`/reviews/new?matchId=${m.id}`}
                    className="ml-auto rounded-lg bg-[var(--stadium-green)] px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-[var(--stadium-green-hover)]"
                  >
                    Analiz Et
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
