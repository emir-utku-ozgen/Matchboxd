import ReviewForm from "@/components/ReviewForm";

export default function ReviewsPage() {
  return (
    <div className="min-h-screen bg-[var(--background)]">
      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
        <h1 className="mb-2 text-3xl font-bold text-[var(--foreground)]">
          Analizler
        </h1>
        <p className="mb-8 text-[var(--muted)]">
          Maç seçip puan verin, Maçın Adamı'nı yazın ve teknik yorumunuzu paylaşın.
        </p>
        <ReviewForm />
      </div>
    </div>
  );
}
