"use client";

import { useState, useTransition } from "react";
import { RefreshCw, CheckCircle2, AlertCircle, Wifi } from "lucide-react";
import { syncMatches, type SyncResult } from "../actions";

type State = "idle" | "loading" | "success" | "error";

export default function SyncButton() {
  const [state, setState]       = useState<State>("idle");
  const [result, setResult]     = useState<SyncResult | null>(null);
  const [errMsg, setErrMsg]     = useState<string>("");
  const [isPending, startTransition] = useTransition();

  function handleSync() {
    setState("loading");
    setResult(null);
    setErrMsg("");

    startTransition(async () => {
      try {
        const res = await syncMatches();
        setResult(res);
        setState("success");
        // 8 saniye sonra idle'a dön
        setTimeout(() => setState("idle"), 8000);
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Bilinmeyen hata";
        setErrMsg(msg);
        setState("error");
        setTimeout(() => setState("idle"), 10000);
      }
    });
  }

  const isLoading = state === "loading" || isPending;

  return (
    <div className="space-y-3">
      {/* Ana buton */}
      <button
        type="button"
        onClick={handleSync}
        disabled={isLoading}
        className={`inline-flex items-center gap-2.5 rounded-lg px-5 py-2.5 text-sm font-medium transition-all disabled:cursor-wait ${
          isLoading
            ? "bg-[var(--stadium-green)]/50 text-white"
            : "bg-[var(--stadium-green)] text-white hover:bg-[var(--stadium-green-hover)] hover:shadow-[0_0_20px_rgba(34,197,94,0.3)]"
        }`}
      >
        <RefreshCw
          className={`h-4 w-4 shrink-0 ${isLoading ? "animate-spin" : ""}`}
        />
        {isLoading ? "Senkronize ediliyor…" : "Veritabanını Güncelle"}
      </button>

      {/* Başarı mesajı */}
      {state === "success" && result && (
        <div className="flex items-start gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
          <div className="text-sm">
            <p className="font-semibold text-emerald-400">Senkronizasyon tamamlandı!</p>
            <p className="mt-0.5 text-emerald-400/80">
              {result.total} maç işlendi ·{" "}
              <strong>{result.added}</strong> yeni eklendi ·{" "}
              <strong>{result.updated}</strong> güncellendi
            </p>
          </div>
        </div>
      )}

      {/* Hata mesajı */}
      {state === "error" && errMsg && (
        <div className="flex items-start gap-3 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />
          <div className="text-sm">
            <p className="font-semibold text-red-400">Senkronizasyon başarısız</p>
            <p className="mt-0.5 break-all text-red-400/80">{errMsg}</p>
          </div>
        </div>
      )}

      {/* Bilgilendirme notu */}
      {state === "idle" && (
        <div className="flex items-start gap-2 text-xs text-[var(--muted)]">
          <Wifi className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>
            football-data.org API üzerinden son 7 gün + sonraki 7 günün maçlarını çeker.
            Gerekli ortam değişkeni: <code className="rounded bg-[var(--background)] px-1 py-0.5 text-[var(--foreground)]">FOOTBALL_DATA_API_KEY</code>
          </span>
        </div>
      )}
    </div>
  );
}
