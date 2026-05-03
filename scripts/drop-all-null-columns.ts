/**
 * Belirtilen tabloda tamamen NULL olan sütunları bulur; Neon SQL Editor'a
 * yapıştırmalık DROP COLUMN komutlarını yazdırır. Silme işlemini otomatik yapmaz.
 *
 * Kullanım:
 *   npm run db:drop-null-cols                      → public.Match (varsayılan)
 *   npm run db:drop-null-cols -- public Match      → şema ve tablo
 */

import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";
import { neonConfig } from "@neondatabase/serverless";
import ws from "ws";

neonConfig.webSocketConstructor = ws;

const IDENT_RE = /^[a-zA-Z_][a-zA-Z0-9_]*$/;

function assertSafeIdent(name: string, label: string): string {
  if (!IDENT_RE.test(name)) {
    throw new Error(
      `${label} yalnızca harf, rakam ve alt çizgi; harf veya alt çizgi ile başlamalı: ${JSON.stringify(name)}`,
    );
  }
  return name;
}

/** SQL tırnaklı tanımlayıcı */
function qIdent(raw: string): string {
  assertSafeIdent(raw, "Tanımlayıcı");
  return `"${raw.replace(/"/g, '""')}"`;
}

/** tsx ilk arg olarak script yolu koyduğundan, .ts/.js ile biten ilk parçayı atlarız */
function userArgsAfterScript(argv: string[]): string[] {
  const rest = argv.slice(2);
  const first = rest[0];
  if (first && (first.endsWith(".ts") || first.endsWith(".js"))) {
    return rest.slice(1);
  }
  return rest;
}

async function main() {
  const tail = userArgsAfterScript(process.argv);
  const schema = tail[0] ?? "public";
  const table = tail[1] ?? "Match";
  const safeSchema = assertSafeIdent(schema, "Şema");
  const safeTable = assertSafeIdent(table, "Tablo");

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

    const cols = await prisma.$queryRaw<ColRow[]>`
      SELECT column_name::text AS column_name
      FROM information_schema.columns
      WHERE table_schema = ${safeSchema}
        AND table_name = ${safeTable}
    `;

    const columnNames = cols.map((r) => r.column_name).filter(Boolean);
    console.log(`\nŞema.tablo: ${safeSchema}.${safeTable}`);
    console.log("Bulunan sütunlar:", JSON.stringify(columnNames));

    const qSchema = qIdent(safeSchema);
    const qTable = qIdent(safeTable);
    type CRow = { count: number };
    const allNull: string[] = [];

    for (const column_name of columnNames) {
      assertSafeIdent(column_name, "Sütun adı");
      const countSql =
        `SELECT COUNT(*)::int AS count FROM ${qSchema}.${qTable} WHERE ${qIdent(column_name)} IS NOT NULL`;
      const rows = await prisma.$queryRawUnsafe<CRow[]>(countSql);
      const [{ count }] = rows;
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
      console.log(`ALTER TABLE ${qSchema}.${qTable} DROP COLUMN ${qIdent(col)};`);
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
