/**
 * Admin Yetkilendirme Scripti
 *
 * Kullanım:
 *   EMAIL=your@email.com npx tsx prisma/make-admin.ts
 *
 * Veya bu dosyada EMAIL sabitini kendiniz düzenleyip çalıştırın:
 *   npx tsx prisma/make-admin.ts
 *
 * Önemli: Script çalıştıktan sonra ilgili kullanıcının
 * çıkış yapıp yeniden giriş yapması gerekir (JWT yenilemesi).
 */

import { PrismaClient } from "@prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";

// ─── Bağlantı ─────────────────────────────────────────────────────────────────

const url       = process.env.DATABASE_URL       ?? "file:./dev.db";
const authToken = process.env.DATABASE_AUTH_TOKEN ?? process.env.TURSO_AUTH_TOKEN;

const adapter = new PrismaLibSql({ url, authToken: authToken ?? undefined });
const prisma  = new PrismaClient({ adapter });

// ─── Hedef e-posta ─────────────────────────────────────────────────────────────

const TARGET_EMAIL = process.env.EMAIL ?? "admin@example.com"; // 👈 buraya e-postayı yaz

// ─── Script ───────────────────────────────────────────────────────────────────

async function main() {
  const user = await prisma.user.findUnique({
    where: { email: TARGET_EMAIL },
    select: { id: true, name: true, email: true, role: true },
  });

  if (!user) {
    console.error(`✗ Kullanıcı bulunamadı: ${TARGET_EMAIL}`);
    process.exit(1);
  }

  if (user.role === "admin") {
    console.log(`ℹ  ${user.email} (${user.name}) zaten admin.`);
    return;
  }

  const updated = await prisma.user.update({
    where: { email: TARGET_EMAIL },
    data: { role: "admin" },
    select: { id: true, name: true, email: true, role: true },
  });

  console.log(`✓ Yetki güncellendi!`);
  console.log(`  İsim  : ${updated.name}`);
  console.log(`  E-posta: ${updated.email}`);
  console.log(`  Yeni Rol: ${updated.role}`);
  console.log(`\n⚠  Kullanıcının çıkış yapıp yeniden giriş yapması gerekiyor.`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
