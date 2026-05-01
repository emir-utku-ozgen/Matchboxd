import Link from "next/link";
import { ShieldX } from "lucide-react";

export default function UnauthorizedPage() {
  return (
    <div className="flex min-h-[calc(100vh-56px)] items-center justify-center bg-[var(--background)] px-4">
      <div className="w-full max-w-md text-center">

        {/* İkon */}
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full border border-red-500/20 bg-red-500/10">
          <ShieldX className="h-9 w-9 text-red-400" />
        </div>

        {/* Başlık */}
        <h1 className="mb-3 text-3xl font-bold text-[var(--foreground)]">
          Yetkisiz Erişim
        </h1>
        <p className="mb-2 text-[var(--muted)]">
          Bu sayfayı görüntülemek için gerekli yetkiye sahip değilsin.
        </p>
        <p className="mb-8 text-sm text-[var(--muted)]">
          Eğer bunun bir hata olduğunu düşünüyorsan sistem yöneticisiyle iletişime geç.
        </p>

        {/* HTTP Kodu */}
        <div className="mx-auto mb-8 inline-block rounded-lg border border-red-500/20 bg-red-500/5 px-4 py-2">
          <span className="font-mono text-sm text-red-400">403 Forbidden</span>
        </div>

        {/* Aksiyonlar */}
        <div className="flex justify-center gap-3">
          <Link
            href="/"
            className="rounded-lg bg-[var(--stadium-green)] px-5 py-2.5 text-sm font-medium text-white hover:bg-[var(--stadium-green-hover)]"
          >
            Ana Sayfaya Dön
          </Link>
          <Link
            href="/login"
            className="rounded-lg border border-[var(--border)] bg-[var(--card-bg)] px-5 py-2.5 text-sm font-medium text-[var(--foreground)] hover:border-[var(--stadium-green)]/50"
          >
            Farklı Hesapla Giriş Yap
          </Link>
        </div>

      </div>
    </div>
  );
}
