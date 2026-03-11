import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  await prisma.match.createMany({
    data: [
      {
        homeTeamName: "Galatasaray",
        awayTeamName: "Fenerbahçe",
        homeScore: 2,
        awayScore: 1,
        competition: "Süper Lig",
        competitionType: "league",
        season: "2024-25",
        matchDate: new Date("2025-03-01T20:00:00Z"),
        venue: "Rams Park",
      },
      {
        homeTeamName: "Real Madrid",
        awayTeamName: "Barcelona",
        homeScore: 3,
        awayScore: 2,
        competition: "La Liga",
        competitionType: "league",
        season: "2024-25",
        matchDate: new Date("2025-02-15T21:00:00Z"),
        venue: "Santiago Bernabéu",
      },
      {
        homeTeamName: "Liverpool",
        awayTeamName: "Manchester City",
        homeScore: 1,
        awayScore: 1,
        competition: "Premier League",
        competitionType: "league",
        season: "2024-25",
        matchDate: new Date("2025-02-20T18:30:00Z"),
        venue: "Anfield",
      },
    ],
  });
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
