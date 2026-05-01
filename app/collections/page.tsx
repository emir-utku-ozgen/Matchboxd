"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { Plus, Trash2, ChevronDown, ChevronUp, Lock, Globe, BookmarkPlus } from "lucide-react";

type MatchItem = {
  id: string;
  homeTeamName: string;
  awayTeamName: string;
  homeScore: number;
  awayScore: number;
  competition: string;
  matchDate: string;
  homeCrest?: string;
  awayCrest?: string;
};

type CollectionMatch = {
  id: string;
  matchId: string;
  addedAt: string;
  match: MatchItem;
};

type Collection = {
  id: string;
  name: string;
  description?: string | null;
  isPublic: boolean;
  type: "WATCHED" | "WATCHLIST" | "FAVORITES" | "CUSTOM";
  matches: CollectionMatch[];
};

const TYPE_ICONS: Record<string, string> = {
  WATCHED:   "✅",
  WATCHLIST: "🗓️",
  FAVORITES: "⭐",
  CUSTOM:    "📁",
};

const TYPE_COLOR: Record<string, string> = {
  WATCHED:   "text-emerald-400",
  WATCHLIST: "text-sky-400",
  FAVORITES: "text-yellow-400",
  CUSTOM:    "text-[var(--muted)]",
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("tr-TR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function CollectionsPage() {
  const { data: session, status } = useSession();
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading]         = useState(true);
  const [expanded, setExpanded]       = useState<Set<string>>(new Set());
  const [newName, setNewName]         = useState("");
  const [newDesc, setNewDesc]         = useState("");
  const [creating, setCreating]       = useState(false);
  const [showForm, setShowForm]       = useState(false);
  const [formError, setFormError]     = useState("");
  const [successMsg, setSuccessMsg]   = useState("");

  const fetchCollections = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/collections");
      if (!res.ok) return;
      const data = await res.json();
      setCollections(Array.isArray(data) ? data : []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (status === "authenticated") fetchCollections();
    else if (status === "unauthenticated") setLoading(false);
  }, [status, fetchCollections]);

  function toggleExpand(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setFormError("");
    setSuccessMsg("");
    if (!newName.trim()) {
      setFormError("Koleksiyon adı boş olamaz.");
      return;
    }
    setCreating(true);
    try {
      const res = await fetch("/api/collections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newName.trim(),
          description: newDesc.trim() || undefined,
        }),
      });

      let data: unknown;
      try {
        data = await res.json();
      } catch {
        setFormError("Sunucu yanıtı okunamadı.");
        return;
      }

      if (!res.ok) {
        const err = data as { error?: string };
        setFormError(err?.error || `Hata (${res.status}): Koleksiyon oluşturulamadı.`);
        return;
      }

      const col = data as Collection;
      setCollections((prev) => [
        ...prev,
        { ...col, matches: col.matches ?? [] },
      ]);
      setNewName("");
      setNewDesc("");
      setShowForm(false);
      setSuccessMsg(`"${col.name}" koleksiyonu oluşturuldu.`);
      setTimeout(() => setSuccessMsg(""), 4000);
    } catch (err) {
      console.error(err);
      setFormError("Ağ hatası. Bağlantınızı kontrol edin.");
    } finally {
      setCreating(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Bu koleksiyonu silmek istediğinize emin misiniz?")) return;
    const res = await fetch(`/api/collections/${id}`, { method: "DELETE" });
    if (res.ok) setCollections((prev) => prev.filter((c) => c.id !== id));
  }

  async function handleRemoveMatch(collectionId: string, matchId: string) {
    const res = await fetch(`/api/collections/${collectionId}/matches`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ matchId }),
    });
    if (res.ok) {
      setCollections((prev) =>
        prev.map((c) =>
          c.id === collectionId
            ? { ...c, matches: c.matches.filter((m) => m.matchId !== matchId) }
            : c
        )
      );
    }
  }

  // ─── Loading ────────────────────────────────────────────────────────────────

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen bg-[var(--background)]">
        <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
          <div className="h-8 w-48 animate-pulse rounded bg-[var(--border)]" />
          <div className="mt-6 space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 animate-pulse rounded-xl bg-[var(--card-bg)]" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ─── Giriş yapılmamış ───────────────────────────────────────────────────────

  if (!session) {
    return (
      <div className="min-h-screen bg-[var(--background)]">
        <div className="mx-auto max-w-4xl px-4 py-10 text-center sm:px-6">
          <h1 className="mb-2 text-3xl font-bold text-[var(--foreground)]">Koleksiyonlar</h1>
          <p className="mb-8 text-[var(--muted)]">
            Koleksiyonlarını görmek için giriş yapmalısın.
          </p>
          <Link
            href="/login"
            className="inline-block rounded-lg bg-[var(--stadium-green)] px-6 py-2.5 font-medium text-white hover:bg-[var(--stadium-green-hover)]"
          >
            Giriş Yap
          </Link>
        </div>
      </div>
    );
  }

  // ─── Ana sayfa ──────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-[var(--background)]">
      <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">

        {/* Başlık */}
        <div className="mb-8 flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-[var(--foreground)]">Koleksiyonlar</h1>
            <p className="mt-1 text-[var(--muted)]">
              {collections.length} koleksiyon ·{" "}
              {collections.reduce((acc, c) => acc + c.matches.length, 0)} maç
            </p>
          </div>
          <button
            type="button"
            onClick={() => { setShowForm((v) => !v); setFormError(""); }}
            className="flex items-center gap-2 rounded-lg bg-[var(--stadium-green)] px-4 py-2.5 text-sm font-medium text-white hover:bg-[var(--stadium-green-hover)]"
          >
            <Plus className="h-4 w-4" />
            Yeni Koleksiyon
          </button>
        </div>

        {/* Başarı mesajı */}
        {successMsg && (
          <div className="mb-4 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-400">
            ✓ {successMsg}
          </div>
        )}

        {/* Yeni koleksiyon formu */}
        {showForm && (
          <form
            onSubmit={handleCreate}
            className="mb-6 rounded-xl border border-[var(--stadium-green)]/40 bg-[var(--card-bg)] p-5"
          >
            <h3 className="mb-4 text-sm font-semibold text-[var(--stadium-green)]">
              Yeni Koleksiyon
            </h3>
            {formError && (
              <p className="mb-3 rounded-md bg-red-500/10 px-3 py-2 text-sm text-red-400">
                {formError}
              </p>
            )}
            <div className="space-y-3">
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Koleksiyon adı (örn: Unutulmaz Deplasmanlarım)"
                required
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-4 py-2.5 text-[var(--foreground)] placeholder:text-[var(--muted)] focus:border-[var(--stadium-green)] focus:outline-none"
              />
              <input
                type="text"
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                placeholder="Açıklama (isteğe bağlı)"
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-4 py-2.5 text-[var(--foreground)] placeholder:text-[var(--muted)] focus:border-[var(--stadium-green)] focus:outline-none"
              />
            </div>
            <div className="mt-4 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => { setShowForm(false); setFormError(""); }}
                className="rounded-lg px-4 py-2 text-sm text-[var(--muted)] hover:text-[var(--foreground)]"
              >
                İptal
              </button>
              <button
                type="submit"
                disabled={creating}
                className="rounded-lg bg-[var(--stadium-green)] px-5 py-2 text-sm font-medium text-white hover:bg-[var(--stadium-green-hover)] disabled:opacity-50"
              >
                {creating ? "Oluşturuluyor..." : "Oluştur"}
              </button>
            </div>
          </form>
        )}

        {/* Koleksiyon listesi */}
        <div className="space-y-3">
          {collections.length === 0 ? (
            <div className="rounded-xl border border-[var(--border)] bg-[var(--card-bg)] p-10 text-center text-[var(--muted)]">
              Henüz koleksiyon yok.
            </div>
          ) : (
            collections.map((col) => {
              const isOpen = expanded.has(col.id);
              return (
                <div
                  key={col.id}
                  className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--card-bg)]"
                >
                  {/*
                   * FIX: Hydration hatası — <button> içinde <button> geçersiz HTML.
                   * Dıştaki tıklanabilir alan artık <div role="button"> oldu;
                   * içteki silme butonu gerçek <button> olmaya devam edebilir.
                   */}
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => toggleExpand(col.id)}
                    onKeyDown={(e) => e.key === "Enter" && toggleExpand(col.id)}
                    className="flex w-full cursor-pointer items-center gap-3 px-5 py-4 text-left hover:bg-white/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--stadium-green)]/50"
                  >
                    <span className="text-xl">{TYPE_ICONS[col.type]}</span>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className={`font-semibold ${TYPE_COLOR[col.type]}`}>
                          {col.name}
                        </span>
                        {col.isPublic ? (
                          <Globe className="h-3.5 w-3.5 text-[var(--muted)]" />
                        ) : (
                          <Lock className="h-3.5 w-3.5 text-[var(--muted)]" />
                        )}
                      </div>
                      {col.description && (
                        <p className="mt-0.5 truncate text-xs text-[var(--muted)]">
                          {col.description}
                        </p>
                      )}
                    </div>

                    <span className="shrink-0 text-xs text-[var(--muted)]">
                      {col.matches.length} maç
                    </span>

                    {isOpen ? (
                      <ChevronUp className="h-4 w-4 shrink-0 text-[var(--muted)]" />
                    ) : (
                      <ChevronDown className="h-4 w-4 shrink-0 text-[var(--muted)]" />
                    )}

                    {/* Silme — e.stopPropagation() ile dış div'in click'ini engeller */}
                    {col.type === "CUSTOM" && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(col.id);
                        }}
                        className="ml-1 shrink-0 rounded p-1 text-[var(--muted)] hover:text-red-400"
                        title="Koleksiyonu sil"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>

                  {/* Maç listesi */}
                  {isOpen && (
                    <div className="border-t border-[var(--border)]">
                      {col.matches.length === 0 ? (
                        <div className="px-5 py-6 text-center">
                          <p className="mb-3 text-sm text-[var(--muted)]">
                            Bu koleksiyonda henüz maç yok.
                          </p>
                          <p className="flex items-center justify-center gap-1.5 text-xs text-[var(--muted)]">
                            <BookmarkPlus className="h-3.5 w-3.5 text-[var(--stadium-green)]" />
                            <Link
                              href="/matches"
                              className="text-[var(--stadium-green)] hover:underline"
                            >
                              Maç detay sayfasındaki
                            </Link>
                            {" "}"Koleksiyona Ekle" butonunu kullanabilirsin.
                          </p>
                        </div>
                      ) : (
                        <ul className="divide-y divide-[var(--border)]">
                          {col.matches.map((cm) => (
                            <li key={cm.id} className="flex items-center gap-4 px-5 py-3">
                              <div className="min-w-0 flex-1">
                                <Link
                                  href={`/matches/${cm.matchId}`}
                                  className="block truncate font-medium text-[var(--foreground)] hover:text-[var(--stadium-green)]"
                                >
                                  {cm.match.homeTeamName}{" "}
                                  <span className="font-bold text-[var(--stadium-green)]">
                                    {cm.match.homeScore}–{cm.match.awayScore}
                                  </span>{" "}
                                  {cm.match.awayTeamName}
                                </Link>
                                <p className="mt-0.5 text-xs text-[var(--muted)]">
                                  {cm.match.competition} · {formatDate(cm.match.matchDate)}
                                </p>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleRemoveMatch(col.id, cm.matchId)}
                                className="shrink-0 rounded p-1 text-[var(--muted)] hover:text-red-400"
                                title="Koleksiyondan çıkar"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
