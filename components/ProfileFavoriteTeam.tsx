"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  userId: string;
  currentUserId: string | null;
  initialFavoriteTeam: string | null;
};

export default function ProfileFavoriteTeam({
  userId,
  currentUserId,
  initialFavoriteTeam,
}: Props) {
  const isOwn = currentUserId === userId;
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(initialFavoriteTeam ?? "");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  if (!isOwn) return null;

  async function handleSave() {
    setLoading(true);
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ favoriteTeam: value.trim() || null }),
      });
      if (res.ok) {
        setEditing(false);
        router.refresh();
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mt-2">
      {editing ? (
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="Tuttuğun takım"
            className="rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-1.5 text-sm text-[var(--foreground)] focus:border-[var(--stadium-green)] focus:outline-none"
          />
          <button
            type="button"
            onClick={handleSave}
            disabled={loading}
            className="rounded-lg bg-[var(--stadium-green)] px-3 py-1.5 text-sm text-white hover:bg-[var(--stadium-green-hover)] disabled:opacity-50"
          >
            {loading ? "..." : "Kaydet"}
          </button>
          <button
            type="button"
            onClick={() => {
              setEditing(false);
              setValue(initialFavoriteTeam ?? "");
            }}
            className="text-sm text-[var(--muted)] hover:text-[var(--foreground)]"
          >
            İptal
          </button>
        </div>
      ) : (
        <p className="text-[var(--muted)]">
          Tuttuğu takım:{" "}
          {initialFavoriteTeam ? (
            <span className="font-medium text-[var(--stadium-green)]">
              {initialFavoriteTeam}
            </span>
          ) : (
            <span className="text-[var(--muted)]">Belirtilmedi</span>
          )}{" "}
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="text-xs text-[var(--stadium-green)] hover:underline"
          >
            {initialFavoriteTeam ? "Değiştir" : "Ekle"}
          </button>
        </p>
      )}
    </div>
  );
}
