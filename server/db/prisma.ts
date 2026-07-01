/**
 * server/db/prisma.ts
 *
 * Prisma Client singleton — database connection utility.
 *
 * Usage:
 *   import { prisma } from "./prisma";
 *   const user = await prisma.users.findUnique({ where: { id: 1 } });
 *
 * The singleton pattern prevents creating multiple PrismaClient instances
 * in development (hot-reload creates new modules on each file change).
 */

import { PrismaClient } from "@prisma/client";
import { database, appConfig } from "../config";

// ── Singleton ─────────────────────────────────────────────────────────────────

declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined;
}

function createPrismaClient(): PrismaClient {
  return new PrismaClient({
    datasourceUrl: database.url,
    log: appConfig.isDev
      ? ["error", "warn"]
      : ["error"],
  });
}

export const prisma: PrismaClient =
  globalThis.__prisma ?? (globalThis.__prisma = createPrismaClient());

if (appConfig.isDev) {
  globalThis.__prisma = prisma;
}

// ── Connection health check ───────────────────────────────────────────────────

/**
 * Verify the database is reachable.
 * Call at startup alongside runMigrations() to fail fast on misconfiguration.
 */
export async function checkDatabaseConnection(): Promise<void> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    console.log("[prisma] Database connection confirmed.");
  } catch (err: any) {
    console.error("[prisma] Database connection failed:", err?.message ?? err);
    throw new Error("Could not connect to the database. Check DATABASE_URL.");
  }
}

/**
 * Gracefully disconnect Prisma (call on process exit or in tests).
 */
export async function disconnectPrisma(): Promise<void> {
  await prisma.$disconnect();
}
