/**
 * "Match" tablosunda tamamen NULL olan sütunları bulur ve Neon SQL Editor'a
 * yapıştırmalık DROP COLUMN komutlarını yazdırır. Hiçbir silme işlemini
 * otomatik yapmaz.
 *
 *   npm run db:drop-null-cols
 */

import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";
import { neonConfig } from "@neondatabase/serverless";
import ws from "ws";

neonConfig.webSocketConstructor = ws;

/** information_schema çıktısındaki ada göre Postgres tırnaklı tanımlayıcı */
function qIdent(raw: string): string {
  return `"${raw.replace(/"/g, '""')}"`;
}

async function main() {
  console.log(`
Neon'da yapıştırmadan önce branch yedeği / snapshot önerilir. DROP COLUMN geri alınamaz.`);

  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL tanımlı değil (.env).");
    process.exit(1);
  }

  const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter, log: ["error"] });

  try {
    type ColRow = { column_name: string };

    const columnsSql =
      `SELECT column_name::text AS column_name
       FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = 'Match'`;
    const cols = await prisma.$queryRawUnsafe<ColRow[]>(columnsSql);

    const columnNames = cols.map((r) => r.column_name).filter(Boolean);
    console.log("\nBulunan sütunlar:", JSON.stringify(columnNames));

    type CRow = { count: bigint };
    const allNull: string[] = [];

    for (const column_name of columnNames) {
      const countSql =
        `SELECT COUNT(*) AS count FROM "Match" WHERE ${qIdent(column_name)} IS NOT NULL`;
      const [{ count }] = await prisma.$queryRawUnsafe<CRow[]>(countSql);
      const n = Number(count);
      console.log(`${column_name}: NOT NULL → ${n}`);
      if (n === 0) allNull.push(column_name);
    }

    console.log("\n=== Tamamen boş (silinebilir) sütunlar ===");
    if (allNull.length === 0) {
      console.log("(yok)");
    } else {
      allNull.forEach((c) => console.log(`  • ${c}`));
    }

    console.log("\n=== Neon SQL Editor — manuel yapıştır ===\n");
    for (const col of allNull) {
      console.log(`ALTER TABLE "Match" DROP COLUMN ${qIdent(col)};`);
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
