import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/db";
import { authOptions } from "@/lib/auth";
import NewReviewForm from "./NewReviewForm";

export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<{ matchId?: string }> };

export default async function NewReviewPage({ searchParams }: Props) {
  const session = await getServerSession(authOptions);
  const { matchId } = await searchParams;

  if (!session?.user) {
    const callbackUrl = matchId
      ? `/reviews/new?matchId=${encodeURIComponent(matchId)}`
      : "/reviews/new";
    redirect(`/login?callbackUrl=${encodeURIComponent(callbackUrl)}`);
  }

  if (!matchId) {
    redirect("/matches");
  }

  const match = await prisma.match.findUnique({
    where: { id: matchId },
  });

  if (!match) {
    redirect("/matches");
  }

  return (
    <div className="min-h-screen bg-[var(--background)]">
      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
        <h1 className="mb-2 text-3xl font-bold text-[var(--foreground)]">
          Analiz yaz
        </h1>
        <p className="mb-8 text-[var(--muted)]">
          {match.homeTeamName} {match.homeScore} - {match.awayScore}{" "}
          {match.awayTeamName}
        </p>
        <NewReviewForm
          matchId={match.id}
          homeTeamName={match.homeTeamName}
          awayTeamName={match.awayTeamName}
        />
      </div>
    </div>
  );
}
