"use client";

import { useState, useTransition } from "react";
import { Trash2, ShieldCheck, User as UserIcon } from "lucide-react";
import ConfirmDialog from "./ConfirmDialog";
import { deleteUser } from "../actions";

export type UserRow = {
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt: string; // ISO — serialize edilmiş
  reviewCount: number;
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("tr-TR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

// ─── Rol Rozeti ───────────────────────────────────────────────────────────────

function RoleBadge({ role }: { role: string }) {
  const styles: Record<string, string> = {
    admin:  "bg-red-500/15 text-red-400 border-red-500/30",
    editor: "bg-amber-500/15 text-amber-400 border-amber-500/30",
    user:   "bg-[var(--border)] text-[var(--muted)] border-[var(--border)]",
  };
  return (
    <span className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-semibold ${styles[role] ?? styles.user}`}>
      {role === "admin" && <ShieldCheck className="h-3 w-3" />}
      {role}
    </span>
  );
}

// ─── Ana Bileşen ──────────────────────────────────────────────────────────────

export default function UserTable({ initialUsers }: { initialUsers: UserRow[] }) {
  const [users, setUsers]           = useState<UserRow[]>(initialUsers);
  const [deleteTarget, setTarget]   = useState<UserRow | null>(null);
  const [isPending, startTransition] = useTransition();

  function confirmDelete() {
    if (!deleteTarget) return;
    startTransition(async () => {
      try {
        await deleteUser(deleteTarget.id);
        setUsers((prev) => prev.filter((u) => u.id !== deleteTarget.id));
      } catch (err) {
        console.error(err);
        alert("Silme işlemi başarısız oldu.");
      } finally {
        setTarget(null);
      }
    });
  }

  // Silinemeyen kullanıcılar: admin rolündekiler ve env-admin
  const canDelete = (u: UserRow) =>
    u.id !== "env-admin" && u.role !== "admin";

  return (
    <>
      <div className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--card-bg)]">
        {/* Tablo */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            {/* Başlık */}
            <thead>
              <tr className="border-b border-[var(--border)] bg-white/[0.02]">
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
                  Kullanıcı
                </th>
                <th className="hidden px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--muted)] sm:table-cell">
                  Kayıt Tarihi
                </th>
                <th className="px-5 py-3 text-center text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
                  Analiz
                </th>
                <th className="px-5 py-3 text-center text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
                  Rol
                </th>
                <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
                  İşlem
                </th>
              </tr>
            </thead>

            {/* Gövde */}
            <tbody className="divide-y divide-[var(--border)]">
              {users.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-5 py-10 text-center text-[var(--muted)]">
                    Kayıtlı kullanıcı bulunamadı.
                  </td>
                </tr>
              )}
              {users.map((u) => (
                <tr key={u.id} className="transition-colors hover:bg-white/[0.025]">
                  {/* Kullanıcı */}
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--stadium-green-muted)] text-xs font-bold text-[var(--stadium-green)]">
                        {u.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate font-medium text-[var(--foreground)]">{u.name}</p>
                        <p className="truncate text-xs text-[var(--muted)]">{u.email}</p>
                      </div>
                    </div>
                  </td>

                  {/* Kayıt tarihi */}
                  <td className="hidden px-5 py-3 text-[var(--muted)] sm:table-cell">
                    {formatDate(u.createdAt)}
                  </td>

                  {/* Analiz sayısı */}
                  <td className="px-5 py-3 text-center">
                    <span
                      className={`font-semibold tabular-nums ${
                        u.reviewCount > 0
                          ? "text-[var(--stadium-green)]"
                          : "text-[var(--muted)]"
                      }`}
                    >
                      {u.reviewCount}
                    </span>
                  </td>

                  {/* Rol */}
                  <td className="px-5 py-3 text-center">
                    <RoleBadge role={u.role} />
                  </td>

                  {/* İşlem */}
                  <td className="px-5 py-3 text-right">
                    {canDelete(u) ? (
                      <button
                        type="button"
                        onClick={() => setTarget(u)}
                        disabled={isPending}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-xs font-medium text-red-400 transition hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Sil
                      </button>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs text-[var(--muted)]">
                        <UserIcon className="h-3.5 w-3.5" />
                        Korumalı
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Alt bilgi satırı */}
        <div className="border-t border-[var(--border)] px-5 py-2.5 text-xs text-[var(--muted)]">
          {users.length} kullanıcı · Admin hesapları ve sistem hesabı silinemez.
        </div>
      </div>

      {/* Onay dialogu */}
      <ConfirmDialog
        isOpen={deleteTarget !== null}
        title="Kullanıcıyı Sil"
        description={
          deleteTarget
            ? `"${deleteTarget.name}" (${deleteTarget.email}) adlı kullanıcı ve ${deleteTarget.reviewCount} analizi kalıcı olarak silinecek. Bu işlem geri alınamaz.`
            : ""
        }
        confirmLabel="Evet, Kalıcı Sil"
        loading={isPending}
        onConfirm={confirmDelete}
        onCancel={() => setTarget(null)}
      />
    </>
  );
}
