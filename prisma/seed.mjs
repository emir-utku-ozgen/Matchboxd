import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaLibSQL } from "@prisma/adapter-libsql";
import { createClient } from "@libsql/client";

const url = process.env.DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;

if (!url) {
  console.error("DATABASE_URL gerekli (Turso: libsql://...)");
  process.exit(1);
}

const libsql = createClient({
  url,
  authToken: authToken || undefined,
});
const adapter = new PrismaLibSQL(libsql);
const prisma = new PrismaClient({ adapter });

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
