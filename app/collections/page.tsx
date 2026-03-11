export default function CollectionsPage() {
  return (
    <div className="min-h-screen bg-[var(--background)]">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <h1 className="mb-2 text-3xl font-bold text-[var(--foreground)]">
          Koleksiyonlar
        </h1>
        <p className="mb-8 text-[var(--muted)]">
          Maç listeleri ve kişisel koleksiyonlar burada.
        </p>
        <div className="rounded-lg border border-[var(--border)] bg-[var(--card-bg)] p-8 text-center text-[var(--muted)]">
          Koleksiyon listesi iskeleti — veri bağlandığında doldurulacak.
        </div>
      </div>
    </div>
  );
}
