export default function AdminPage() {
  return (
    <div className="min-h-screen bg-[var(--background)]">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <h1 className="mb-2 text-3xl font-bold text-[var(--foreground)]">
          Admin
        </h1>
        <p className="mb-8 text-[var(--muted)]">
          Kullanıcılar, maç ekleme ve sistem ayarları (rol kontrolü ile).
        </p>
        <div className="rounded-lg border border-[var(--border)] bg-[var(--card-bg)] p-8 text-center text-[var(--muted)]">
          Admin paneli iskeleti — yetkilendirme ve CRUD eklenecek.
        </div>
      </div>
    </div>
  );
}
