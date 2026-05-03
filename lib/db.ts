import { PrismaClient } from "@prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";
import { neonConfig } from "@neondatabase/serverless";
import ws from "ws";

// Node.js ortamında WebSocket desteği.
// Edge/Vercel runtime'da global WebSocket zaten tanımlı, bu satır atlanır.
if (typeof WebSocket === "undefined") {
  neonConfig.webSocketConstructor = ws;
}

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };

function createPrisma(): PrismaClient {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL ortam değişkeni tanımlı değil.");
  }

  // PrismaNeon, PoolConfig alır — libsql veya başka sürücü devreye girmez.
  const adapter = new PrismaNeon({ connectionString });

  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });
}

/** Tek Node sürecinde (Vercel Server Function dahil) tek PrismaClient örneği */
export const prisma =
  globalForPrisma.prisma ??
  (globalForPrisma.prisma = createPrisma());
