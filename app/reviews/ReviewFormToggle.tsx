"use client";

import { useState } from "react";
import { PenLine, ChevronDown } from "lucide-react";
import ReviewForm from "@/components/ReviewForm";

type Props = {
  /** Takım filtresi aktifken bile maç seçimini serbest bırak — initialMatchId geçme */
  initialMatchId?: string;
};

export default function ReviewFormToggle({ initialMatchId }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card-bg)]">
      {/* Toggle başlık */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left transition-colors hover:bg-white/[0.025]"
      >
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--stadium-green-muted)]">
            <PenLine className="h-4 w-4 text-[var(--stadium-green)]" />
          </span>
          <div>
            <p className="text-sm font-semibold text-[var(--foreground)]">Yeni Analiz Yaz</p>
            <p className="text-xs text-[var(--muted)]">
              {open ? "Formu kapatmak için tıkla" : "Bir maçı değerlendir, yorumunu paylaş"}
            </p>
          </div>
        </div>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-[var(--muted)] transition-transform duration-200 ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>

      {/* Accordion içeriği */}
      <div
        className={`transition-all duration-300 ease-in-out ${
          open ? "max-h-[9999px] opacity-100" : "max-h-0 overflow-hidden opacity-0"
        }`}
      >
        <div className="border-t border-[var(--border)] p-5">
          <ReviewForm initialMatchId={initialMatchId} />
        </div>
      </div>
    </div>
  );
}
