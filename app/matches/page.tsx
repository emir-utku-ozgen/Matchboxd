"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Search, X, SlidersHorizontal, ChevronLeft, ChevronRight } from "lucide-react";

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

type Match = {
  id:           string;
  homeTeamName: string;
  awayTeamName: string;
  homeCrest:    string | null;
  awayCrest:    string | null;
  homeScore:    number;
  awayScore:    number;
  competition:  string;
  season:       string;
  matchDate:    string;
  venue:        string;
  status:       string | null;
  statsJson:    string | null;
};

type ApiResponse = {
  matches:    Match[];
  total:      number;
  page:       number;
  totalPages: number;
};

type Filters = {
  query:       string;
  competition: string;
  season:      string;
  formation:   string;
};

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────

const LIMIT       = 20;
const DEBOUNCE_MS = 300;

const FORMATIONS = [
  "4-3-3", "4-2-3-1", "4-4-2", "3-5-2", "4-1-4-1",
  "3-4-3", "5-3-2", "4-3-2-1", "3-4-2-1", "4-4-1-1",
];

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function formatDate(str: string) {
  return new Date(str).toLocaleDateString("tr-TR", {
    day: "numeric", month: "short", year: "numeric",
  });
}

function getFormations(statsJson: string | null): { home?: string; away?: string } {
  if (!statsJson) return {};
  try {
    const parsed = JSON.parse(statsJson);
    return { home: parsed.homeFormation, away: parsed.awayFormation };
  } catch {
    return {};
  }
}

function buildUrl(
  pathname: string,
  params: Record<string, string | number>
): string {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== "" && v !== 0) sp.set(k, String(v));
  }
  const qs = sp.toString();
  return qs ? `${pathname}?${qs}` : pathname;
}

// ─────────────────────────────────────────────────────────────────────────────
// SUB-COMPONENTS
// ─────────────────────────────────────────────────────────────────────────────

/** Tek bir iskelet kart (yükleme sırasında gösterilir) */
function SkeletonCard() {
  return (
    <li className="rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-6">
        {/* Ev sahibi */}
        <div className="flex flex-1 items-center justify-between gap-3">
          <div className="h-4 w-32 animate-pulse rounded bg-[var(--border)]" />
          <div className="h-8 w-8 animate-pulse rounded-full bg-[var(--border)]" />
        </div>
        {/* Skor */}
        <div className="flex min-w-[80px] justify-center gap-2">
          <div className="h-7 w-14 animate-pulse rounded bg-[var(--border)]" />
        </div>
        {/* Deplasman */}
        <div className="flex flex-1 items-center justify-between gap-3">
          <div className="h-8 w-8 animate-pulse rounded-full bg-[var(--border)]" />
          <div className="h-4 w-32 animate-pulse rounded bg-[var(--border)]" />
        </div>
        {/* Meta */}
        <div className="flex gap-2 border-t border-[var(--border)] pt-3 sm:border-t-0 sm:pt-0">
          <div className="h-5 w-24 animate-pulse rounded bg-[var(--border)]" />
          <div className="h-5 w-20 animate-pulse rounded bg-[var(--border)]" />
        </div>
      </div>
    </li>
  );
}

/** Maç kartı */
function MatchCard({ m }: { m: Match }) {
  const formations = getFormations(m.statsJson);
  return (
    <li
      className="group flex cursor-pointer flex-col rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] p-5 shadow-sm transition-all duration-200 hover:border-[var(--stadium-green)]/50 hover:shadow-[0_0_28px_rgba(34,197,94,0.12)] sm:flex-row sm:items-center sm:gap-6"
      onClick={() => (window.location.href = `/matches/${m.id}`)}
    >
      <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
        {/* Ev sahibi */}
        <div className="flex w-full items-center justify-between gap-2 sm:w-auto sm:flex-1">
          <div className="flex flex-col items-end gap-0.5">
            <span className="truncate text-left font-medium text-[var(--foreground)] sm:text-right">
              {m.homeTeamName}
            </span>
            {formations.home && (
              <span className="text-xs text-[var(--muted)]">{formations.home}</span>
            )}
          </div>
          <div className="relative h-8 w-8 shrink-0 overflow-hidden rounded-full bg-[var(--background)] ring-1 ring-[var(--border)]">
            {m.homeCrest ? (
              <Image src={m.homeCrest} alt="" fill className="object-contain" unoptimized sizes="32px" />
            ) : (
              <span className="flex h-full w-full items-center justify-center text-xs text-[var(--muted)]">—</span>
            )}
          </div>
        </div>

        {/* Skor */}
        <div className="flex min-w-[80px] shrink-0 items-center justify-center gap-2 py-1">
          <span className="text-xl font-bold tabular-nums text-[var(--foreground)]">{m.homeScore}</span>
          <span className="text-[var(--muted)]">–</span>
          <span className="text-xl font-bold tabular-nums text-[var(--foreground)]">{m.awayScore}</span>
        </div>

        {/* Deplasman */}
        <div className="flex w-full items-center justify-between gap-2 sm:w-auto sm:flex-1">
          <div className="relative h-8 w-8 shrink-0 overflow-hidden rounded-full bg-[var(--background)] ring-1 ring-[var(--border)]">
            {m.awayCrest ? (
              <Image src={m.awayCrest} alt="" fill className="object-contain" unoptimized sizes="32px" />
            ) : (
              <span className="flex h-full w-full items-center justify-center text-xs text-[var(--muted)]">—</span>
            )}
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="truncate text-right font-medium text-[var(--foreground)]">
              {m.awayTeamName}
            </span>
            {formations.away && (
              <span className="text-xs text-[var(--muted)]">{formations.away}</span>
            )}
          </div>
        </div>
      </div>

      {/* Meta satırı */}
      <div className="mt-3 flex flex-wrap items-center gap-3 border-t border-[var(--border)] pt-4 sm:mt-0 sm:border-t-0 sm:pt-0">
        <span className="text-sm text-[var(--muted)]">{formatDate(m.matchDate)}</span>
        <span className="rounded-lg bg-[var(--background)] px-2.5 py-1 text-xs text-[var(--muted)]">
          {m.competition}
        </span>
        {m.status && m.status !== "NS" && (
          <span className="rounded-lg bg-[var(--stadium-green-muted)] px-2.5 py-1 text-xs font-medium text-[var(--stadium-green)]">
            {m.status}
          </span>
        )}
        <Link
          href={`/matches/${m.id}`}
          onClick={(e) => e.stopPropagation()}
          className="ml-auto rounded-lg bg-[var(--stadium-green)] px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-[var(--stadium-green-hover)]"
        >
          Detay &amp; Analiz
        </Link>
      </div>
    </li>
  );
}

/** Select dropdown */
function FilterSelect({
  label,
  value,
  onChange,
  options,
  placeholder,
}: {
  label:       string;
  value:       string;
  onChange:    (v: string) => void;
  options:     string[];
  placeholder: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-medium text-[var(--muted)]">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-lg border border-[var(--border)] bg-[var(--card-bg)] px-3 py-2 text-sm text-[var(--foreground)] outline-none transition focus:border-[var(--stadium-green)] focus:ring-2 focus:ring-[var(--stadium-green)]/20"
      >
        <option value="">{placeholder}</option>
        {options.map((o) => (
          <option key={o} value={o}>{o}</option>
        ))}
      </select>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────────────────────────────────────────

export default function MatchesPage() {
  const router      = useRouter();
  const pathname    = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  // ── URL'den başlangıç değerleri ────────────────────────────────────────
  const [filters, setFilters] = useState<Filters>({
    query:       searchParams.get("query")       ?? "",
    competition: searchParams.get("competition") ?? "",
    season:      searchParams.get("season")      ?? "",
    formation:   searchParams.get("formation")   ?? "",
  });
  const [page,    setPage]    = useState<number>(parseInt(searchParams.get("page") ?? "1", 10));

  // Arama kutusu için ayrı local state (debounce)
  const [searchInput, setSearchInput] = useState(filters.query);

  // ── Filtre seçenekleri ─────────────────────────────────────────────────
  const [competitions, setCompetitions] = useState<string[]>([]);
  const [seasons,      setSeasons]      = useState<string[]>([]);

  useEffect(() => {
    fetch("/api/matches/filters")
      .then((r) => r.json())
      .then((d) => {
        setCompetitions(d.competitions ?? []);
        setSeasons(d.seasons ?? []);
      })
      .catch(() => {});
  }, []);

  // ── Maç verisi ─────────────────────────────────────────────────────────
  const [data,    setData]    = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(false);

  // URL güncelleme + fetch tetikleyici
  const applyFilters = useCallback(
    (newFilters: Filters, newPage: number) => {
      setFilters(newFilters);
      setPage(newPage);
      startTransition(() => {
        router.replace(
          buildUrl(pathname, {
            query:       newFilters.query,
            competition: newFilters.competition,
            season:      newFilters.season,
            formation:   newFilters.formation,
            page:        newPage > 1 ? newPage : "",
          }),
          { scroll: false }
        );
      });
    },
    [router, pathname]
  );

  // Debounce için ref
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleSearchChange = (value: string) => {
    setSearchInput(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      applyFilters({ ...filters, query: value }, 1);
    }, DEBOUNCE_MS);
  };

  const handleFilterChange = (key: keyof Filters, value: string) => {
    applyFilters({ ...filters, [key]: value }, 1);
  };

  const hasActiveFilters =
    filters.query || filters.competition || filters.season || filters.formation;

  const handleReset = () => {
    setSearchInput("");
    applyFilters({ query: "", competition: "", season: "", formation: "" }, 1);
  };

  // ── Veri çekme ─────────────────────────────────────────────────────────
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(false);

    const params = new URLSearchParams();
    if (filters.query)       params.set("query",       filters.query);
    if (filters.competition) params.set("competition", filters.competition);
    if (filters.season)      params.set("season",      filters.season);
    if (filters.formation)   params.set("formation",   filters.formation);
    params.set("page",  String(page));
    params.set("limit", String(LIMIT));

    fetch(`/api/matches?${params.toString()}`, { signal: controller.signal })
      .then((r) => {
        if (!r.ok) throw new Error("API hatası");
        return r.json() as Promise<ApiResponse>;
      })
      .then((d) => {
        setData(d);
        setLoading(false);
      })
      .catch((e) => {
        if (e.name !== "AbortError") {
          setError(true);
          setLoading(false);
        }
      });

    return () => controller.abort();
  }, [filters, page]);

  // ── Sayfalama ──────────────────────────────────────────────────────────
  const totalPages  = data?.totalPages ?? 1;
  const totalCount  = data?.total      ?? 0;

  const pageNumbers = useMemo(() => {
    const delta = 2;
    const range: (number | "…")[] = [];
    for (let i = Math.max(1, page - delta); i <= Math.min(totalPages, page + delta); i++) {
      range.push(i);
    }
    if (range[0] !== 1) {
      range.unshift("…");
      range.unshift(1);
    }
    if (range[range.length - 1] !== totalPages) {
      range.push("…");
      range.push(totalPages);
    }
    return range;
  }, [page, totalPages]);

  // ─────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-[var(--background)]">
      <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">

        {/* ── Başlık ──────────────────────────────────────────────────── */}
        <div className="mb-8 flex flex-col gap-1">
          <h1 className="text-3xl font-bold text-[var(--foreground)]">Maçlar</h1>
          <p className="text-sm text-[var(--muted)]">
            {loading
              ? "Aranıyor…"
              : `${totalCount.toLocaleString("tr-TR")} maç`
            }
            {" · "}
            <Link href="/admin" className="text-[var(--stadium-green)] hover:underline">
              Veri güncelle
            </Link>
          </p>
        </div>

        {/* ── Arama + Filtreler ────────────────────────────────────────── */}
        <div className="mb-6 rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] p-4">
          {/* Arama çubuğu */}
          <div className="relative mb-4">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]"
            />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Takım adı ile ara… (örn. Galatasaray, Arsenal)"
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--background)] py-2.5 pl-9 pr-10 text-sm text-[var(--foreground)] placeholder:text-[var(--muted)] outline-none transition focus:border-[var(--stadium-green)] focus:ring-2 focus:ring-[var(--stadium-green)]/20"
            />
            {searchInput && (
              <button
                type="button"
                onClick={() => handleSearchChange("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--muted)] hover:text-[var(--foreground)]"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Filtre satırı */}
          <div className="flex flex-wrap items-end gap-3">
            <SlidersHorizontal size={14} className="mb-2 shrink-0 text-[var(--muted)]" />

            <FilterSelect
              label="Lig / Kategori"
              value={filters.competition}
              onChange={(v) => handleFilterChange("competition", v)}
              options={competitions}
              placeholder="Tüm ligler"
            />

            <FilterSelect
              label="Sezon"
              value={filters.season}
              onChange={(v) => handleFilterChange("season", v)}
              options={seasons}
              placeholder="Tüm sezonlar"
            />

            <FilterSelect
              label="Diziliş"
              value={filters.formation}
              onChange={(v) => handleFilterChange("formation", v)}
              options={FORMATIONS}
              placeholder="Tüm dizilişler"
            />

            {hasActiveFilters && (
              <div className="flex flex-col gap-1">
                <span className="text-xs font-medium text-transparent select-none">.</span>
                <button
                  type="button"
                  onClick={handleReset}
                  className="flex items-center gap-1.5 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm font-medium text-red-400 transition hover:bg-red-500/20"
                >
                  <X size={13} />
                  Filtreleri Sıfırla
                </button>
              </div>
            )}
          </div>
        </div>

        {/* ── Liste ───────────────────────────────────────────────────── */}
        {error ? (
          <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-8 text-center text-sm text-red-400">
            Maçlar yüklenemedi. Lütfen sayfayı yenileyin.
          </div>
        ) : loading || isPending ? (
          <ul className="space-y-4">
            {Array.from({ length: LIMIT }, (_, i) => (
              <SkeletonCard key={i} />
            ))}
          </ul>
        ) : data?.matches.length === 0 ? (
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] p-12 text-center">
            <p className="mb-3 text-[var(--muted)]">
              {hasActiveFilters
                ? "Bu kriterlere uyan maç bulunamadı."
                : "Henüz maç yok."}
            </p>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={handleReset}
                className="inline-block rounded-lg bg-[var(--stadium-green)] px-5 py-2.5 text-sm font-medium text-white hover:bg-[var(--stadium-green-hover)]"
              >
                Filtreleri temizle
              </button>
            )}
          </div>
        ) : (
          <ul className="space-y-4">
            {data?.matches.map((m) => (
              <MatchCard key={m.id} m={m} />
            ))}
          </ul>
        )}

        {/* ── Sayfalama ───────────────────────────────────────────────── */}
        {!loading && !error && totalPages > 1 && (
          <div className="mt-8 flex items-center justify-center gap-1">
            {/* Önceki */}
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => applyFilters(filters, page - 1)}
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--card-bg)] text-[var(--muted)] transition hover:border-[var(--stadium-green)]/50 hover:text-[var(--foreground)] disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ChevronLeft size={16} />
            </button>

            {/* Sayfa numaraları */}
            {pageNumbers.map((p, i) =>
              p === "…" ? (
                <span
                  key={`ellipsis-${i}`}
                  className="flex h-9 w-9 items-center justify-center text-sm text-[var(--muted)]"
                >
                  …
                </span>
              ) : (
                <button
                  key={p}
                  type="button"
                  onClick={() => applyFilters(filters, p as number)}
                  className={`flex h-9 w-9 items-center justify-center rounded-lg border text-sm font-medium transition ${
                    p === page
                      ? "border-[var(--stadium-green)] bg-[var(--stadium-green)] text-white shadow-[0_0_12px_rgba(34,197,94,0.3)]"
                      : "border-[var(--border)] bg-[var(--card-bg)] text-[var(--muted)] hover:border-[var(--stadium-green)]/50 hover:text-[var(--foreground)]"
                  }`}
                >
                  {p}
                </button>
              )
            )}

            {/* Sonraki */}
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => applyFilters(filters, page + 1)}
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--card-bg)] text-[var(--muted)] transition hover:border-[var(--stadium-green)]/50 hover:text-[var(--foreground)] disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        )}

        {/* Sayfa bilgisi */}
        {!loading && !error && totalPages > 1 && (
          <p className="mt-3 text-center text-xs text-[var(--muted)]">
            {((page - 1) * LIMIT + 1).toLocaleString("tr-TR")}–
            {Math.min(page * LIMIT, totalCount).toLocaleString("tr-TR")} / {totalCount.toLocaleString("tr-TR")} maç
          </p>
        )}

      </div>
    </div>
  );
}
