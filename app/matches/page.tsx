export const dynamic = 'force-dynamic';
import { Suspense } from "react";
import MatchesContent from "./MatchesContent";

function MatchesSkeleton() {
  return (
    <div className="min-h-screen bg-[var(--background)]">
      <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="mb-8">
          <div className="mb-2 h-9 w-32 animate-pulse rounded-lg bg-[var(--border)]" />
          <div className="h-4 w-48 animate-pulse rounded bg-[var(--border)]" />
        </div>
        <div className="mb-6 h-28 animate-pulse rounded-2xl bg-[var(--card-bg)]" />
        <ul className="space-y-4">
          {Array.from({ length: 6 }, (_, i) => (
            <li key={i} className="h-24 animate-pulse rounded-2xl bg-[var(--card-bg)]" />
          ))}
        </ul>
      </div>
    </div>
  );
}

export default function MatchesPage() {
  return (
    <Suspense fallback={<MatchesSkeleton />}>
      <MatchesContent />
    </Suspense>
  );
}
