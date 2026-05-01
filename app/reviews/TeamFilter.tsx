"use client";

import { useState, useRef, useEffect, useId } from "react";
import { useRouter } from "next/navigation";
import { Users, Search, X, Check, ChevronDown } from "lucide-react";

type Props = {
  teams:        string[];
  selectedTeam?: string;
};

export default function TeamFilter({ teams, selectedTeam }: Props) {
  const router  = useRouter();
  const inputId = useId();

  const [open, setOpen]     = useState(false);
  const [query, setQuery]   = useState("");
  const containerRef        = useRef<HTMLDivElement>(null);
  const inputRef            = useRef<HTMLInputElement>(null);

  // Filtrelenmiş liste
  const filtered = query.trim()
    ? teams.filter((t) =>
        t.toLocaleLowerCase("tr").includes(query.toLocaleLowerCase("tr"))
      )
    : teams;

  // Dışarı tıklanınca kapat
  useEffect(() => {
    function handlePointerDown(e: PointerEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery("");
      }
    }
    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, []);

  // Açılınca input'a odaklan
  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  function select(team: string) {
    router.push(`/reviews?team=${encodeURIComponent(team)}`);
    setOpen(false);
    setQuery("");
  }

  function clear(e: React.MouseEvent) {
    e.stopPropagation();
    router.push("/reviews");
    setOpen(false);
    setQuery("");
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Escape") {
      setOpen(false);
      setQuery("");
    }
    if (e.key === "Enter" && filtered.length === 1) {
      select(filtered[0]);
    }
  }

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
      {/* Etiket */}
      <div className="flex shrink-0 items-center gap-1.5 text-sm font-medium text-[var(--muted)]">
        <Users className="h-4 w-4" />
        Takıma göre filtrele:
      </div>

      {/* Combobox */}
      <div ref={containerRef} className="relative flex-1 sm:max-w-sm">

        {/* Trigger */}
        <button
          type="button"
          id={inputId}
          onClick={() => setOpen((o) => !o)}
          aria-haspopup="listbox"
          aria-expanded={open}
          className={`flex w-full items-center justify-between gap-2 rounded-xl border px-4 py-2.5 text-sm transition-colors ${
            open
              ? "border-[var(--stadium-green)] bg-[var(--card-bg)] ring-1 ring-[var(--stadium-green)]"
              : "border-[var(--border)] bg-[var(--card-bg)] hover:border-[var(--stadium-green)]/40"
          }`}
        >
          <span className={selectedTeam ? "text-[var(--foreground)]" : "text-[var(--muted)]"}>
            {selectedTeam ?? "Tüm Takımlar"}
          </span>
          <div className="flex items-center gap-1">
            {selectedTeam && (
              <span
                role="button"
                tabIndex={0}
                onClick={clear}
                onKeyDown={(e) => e.key === "Enter" && clear(e as unknown as React.MouseEvent)}
                className="rounded p-0.5 text-[var(--muted)] hover:text-[var(--foreground)]"
                aria-label="Filtreyi temizle"
              >
                <X className="h-3.5 w-3.5" />
              </span>
            )}
            <ChevronDown
              className={`h-4 w-4 shrink-0 text-[var(--muted)] transition-transform duration-150 ${
                open ? "rotate-180" : ""
              }`}
            />
          </div>
        </button>

        {/* Dropdown */}
        {open && (
          <div
            role="listbox"
            aria-label="Takım listesi"
            className="absolute left-0 top-full z-50 mt-1.5 w-full overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--card-bg)] shadow-xl shadow-black/30"
          >
            {/* Arama inputu */}
            <div className="flex items-center gap-2 border-b border-[var(--border)] px-3 py-2.5">
              <Search className="h-4 w-4 shrink-0 text-[var(--muted)]" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Takım ara…"
                className="flex-1 bg-transparent text-sm text-[var(--foreground)] placeholder:text-[var(--muted)] focus:outline-none"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  className="text-[var(--muted)] hover:text-[var(--foreground)]"
                  aria-label="Aramayı temizle"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* "Tüm Takımlar" seçeneği */}
            <ul className="max-h-60 overflow-y-auto py-1">
              <li>
                <button
                  type="button"
                  role="option"
                  aria-selected={!selectedTeam}
                  onClick={() => { router.push("/reviews"); setOpen(false); setQuery(""); }}
                  className={`flex w-full items-center gap-2 px-4 py-2 text-left text-sm transition-colors hover:bg-[var(--stadium-green-muted)] hover:text-[var(--stadium-green)] ${
                    !selectedTeam ? "text-[var(--stadium-green)]" : "text-[var(--muted)]"
                  }`}
                >
                  <Check
                    className={`h-3.5 w-3.5 shrink-0 ${!selectedTeam ? "opacity-100" : "opacity-0"}`}
                  />
                  Tüm Takımlar
                </button>
              </li>

              {/* Filtrelenmiş takımlar */}
              {filtered.length === 0 ? (
                <li className="px-4 py-3 text-center text-sm text-[var(--muted)]">
                  "{query}" için sonuç bulunamadı
                </li>
              ) : (
                filtered.map((t) => {
                  const isSelected = t === selectedTeam;
                  return (
                    <li key={t}>
                      <button
                        type="button"
                        role="option"
                        aria-selected={isSelected}
                        onClick={() => select(t)}
                        className={`flex w-full items-center gap-2 px-4 py-2 text-left text-sm transition-colors hover:bg-[var(--stadium-green-muted)] hover:text-[var(--stadium-green)] ${
                          isSelected
                            ? "bg-[var(--stadium-green-muted)] font-medium text-[var(--stadium-green)]"
                            : "text-[var(--foreground)]"
                        }`}
                      >
                        <Check
                          className={`h-3.5 w-3.5 shrink-0 ${isSelected ? "opacity-100" : "opacity-0"}`}
                        />
                        {/* Eşleşen kısmı vurgula */}
                        <HighlightMatch text={t} query={query} />
                      </button>
                    </li>
                  );
                })
              )}
            </ul>

            {/* Sonuç sayısı */}
            {query && filtered.length > 0 && (
              <p className="border-t border-[var(--border)] px-4 py-2 text-xs text-[var(--muted)]">
                {filtered.length} takım bulundu
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Eşleşen metni bold ile vurgula ──────────────────────────────────────────

function HighlightMatch({ text, query }: { text: string; query: string }) {
  if (!query.trim()) return <span>{text}</span>;

  const lower = text.toLocaleLowerCase("tr");
  const q     = query.trim().toLocaleLowerCase("tr");
  const idx   = lower.indexOf(q);

  if (idx === -1) return <span>{text}</span>;

  return (
    <span>
      {text.slice(0, idx)}
      <strong className="font-semibold text-[var(--stadium-green)]">
        {text.slice(idx, idx + q.length)}
      </strong>
      {text.slice(idx + q.length)}
    </span>
  );
}
