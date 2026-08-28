import "server-only";
import { PrismaClient } from "@prisma/client";
import { isProduction } from "@/lib/env";

/**
 * Single PrismaClient per process. Next.js dev mode re-evaluates modules on every
 * hot reload; without the global cache each reload would open a new connection
 * pool until the database refuses connections.
 */
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: isProduction ? ["error"] : ["error", "warn"],
  });

if (!isProduction) {
  globalForPrisma.prisma = prisma;
}
