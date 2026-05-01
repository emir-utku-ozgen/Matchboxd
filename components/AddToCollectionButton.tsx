"use client";

import { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { BookmarkPlus, Check, ChevronDown, Loader2 } from "lucide-react";

type CollectionOption = {
  id: string;
  name: string;
  type: string;
  hasMatch: boolean;
};

const TYPE_ICONS: Record<string, string> = {
  WATCHED:   "✅",
  WATCHLIST: "🗓️",
  FAVORITES: "⭐",
  CUSTOM:    "📁",
};

export default function AddToCollectionButton({ matchId }: { matchId: string }) {
  const { data: session, status } = useSession();
  const [open, setOpen]           = useState(false);
  const [collections, setCollections] = useState<CollectionOption[]>([]);
  const [fetchLoading, setFetchLoading] = useState(false);
  const [saving, setSaving]       = useState<string | null>(null);
  const [fetched, setFetched]     = useState(false);
  const containerRef              = useRef<HTMLDivElement>(null);

  // Dropdown açıldığında koleksiyonları çek (bir kere)
  useEffect(() => {
    if (!open || !session || fetched) return;

    setFetchLoading(true);
    fetch("/api/collections")
      .then((r) => (r.ok ? r.json() : []))
      .then((data: Array<{ id: string; name: string; type: string; matches: Array<{ matchId: string }> }>) => {
        if (!Array.isArray(data)) return;
        setCollections(
          data.map((c) => ({
            id: c.id,
            name: c.name,
            type: c.type,
            // Bu maçın koleksiyonda olup olmadığını kontrol et
            hasMatch: c.matches.some((m) => m.matchId === matchId),
          }))
        );
        setFetched(true);
      })
      .catch(console.error)
      .finally(() => setFetchLoading(false));
  }, [open, session, fetched, matchId]);

  // Dışarı tıklayınca kapat
  useEffect(() => {
    function onMouseDown(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, []);

  // Esc tuşuyla kapat
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  // Koleksiyona ekle / çıkar toggle
  async function toggle(col: CollectionOption) {
    setSaving(col.id);
    try {
      const method = col.hasMatch ? "DELETE" : "POST";
      const res = await fetch(`/api/collections/${col.id}/matches`, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ matchId }),
      });

      if (res.ok) {
        setCollections((prev) =>
          prev.map((c) =>
            c.id === col.id ? { ...c, hasMatch: !c.hasMatch } : c
          )
        );
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(null);
    }
  }

  // Giriş yapılmamışsa butonu gösterme
  if (status === "unauthenticated") return null;

  // Kaç koleksiyonda bu maç var?
  const savedCount = collections.filter((c) => c.hasMatch).length;

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${
          savedCount > 0
            ? "border-[var(--stadium-green)]/60 bg-[var(--stadium-green-muted)] text-[var(--stadium-green)]"
            : "border-[var(--border)] bg-[var(--card-bg)] text-[var(--foreground)] hover:border-[var(--stadium-green)]/50 hover:text-[var(--stadium-green)]"
        }`}
      >
        <BookmarkPlus className="h-4 w-4 shrink-0" />
        <span>
          {savedCount > 0 ? `${savedCount} koleksiyonda` : "Koleksiyona Ekle"}
        </span>
        <ChevronDown
          className={`h-3.5 w-3.5 shrink-0 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-64 overflow-hidden rounded-xl border border-[var(--border)] bg-[#1a1a1a] shadow-[0_8px_40px_rgba(0,0,0,0.6)]">
          <div className="border-b border-[var(--border)] px-4 py-2.5">
            <p className="text-xs font-semibold text-[var(--muted)]">Koleksiyona Ekle / Çıkar</p>
          </div>

          {fetchLoading ? (
            <div className="flex items-center justify-center gap-2 px-4 py-5 text-sm text-[var(--muted)]">
              <Loader2 className="h-4 w-4 animate-spin" />
              Yükleniyor…
            </div>
          ) : collections.length === 0 ? (
            <div className="px-4 py-5 text-center text-sm text-[var(--muted)]">
              Koleksiyon bulunamadı.
            </div>
          ) : (
            <ul className="max-h-64 overflow-y-auto py-1">
              {collections.map((col) => {
                const isSaving = saving === col.id;
                return (
                  <li key={col.id}>
                    <button
                      type="button"
                      disabled={isSaving}
                      onClick={() => toggle(col)}
                      className="flex w-full items-center gap-3 px-4 py-2.5 text-sm transition-colors hover:bg-white/5 disabled:cursor-wait"
                    >
                      {/* Checkbox */}
                      <span
                        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border transition-colors ${
                          col.hasMatch
                            ? "border-[var(--stadium-green)] bg-[var(--stadium-green)]"
                            : "border-[var(--border)] bg-transparent"
                        }`}
                      >
                        {isSaving ? (
                          <Loader2 className="h-3 w-3 animate-spin text-white" />
                        ) : col.hasMatch ? (
                          <Check className="h-3 w-3 text-white" strokeWidth={2.5} />
                        ) : null}
                      </span>

                      {/* İkon + İsim */}
                      <span className="mr-0.5 text-base leading-none">
                        {TYPE_ICONS[col.type] ?? "📁"}
                      </span>
                      <span
                        className={
                          col.hasMatch
                            ? "font-medium text-[var(--foreground)]"
                            : "text-[var(--foreground)]/80"
                        }
                      >
                        {col.name}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}

          <div className="border-t border-[var(--border)] px-4 py-2.5 text-xs text-[var(--muted)]">
            Bir koleksiyona tıklayarak ekle veya çıkar.
          </div>
        </div>
      )}
    </div>
  );
}
