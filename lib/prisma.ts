import "server-only";
import { PrismaClient } from "@prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";
import { isProduction } from "@/lib/env";

/**
 * Single PrismaClient per process.
 *
 * Next.js dev mode re-evaluates modules on every hot reload; without the global
 * cache each reload would open a new connection pool until the database refuses
 * connections.
 *
 * ## Why the Neon adapter in production
 *
 * A serverless container is frozen between invocations and its TCP sockets do
 * not survive the freeze. A Prisma client that opened a pooled connection on a
 * cold start therefore hands the next request a dead socket, and the query fails
 * with P1017 "Server has closed the connection" — observed in production as a
 * 500 on `prisma.session.findUnique()`, which takes down every authenticated
 * page and every guarded action at once because session lookup is the first
 * thing they do.
 *
 * The Neon adapter sends each query over HTTP rather than holding a socket, so
 * there is nothing to go stale across a freeze. Outside Vercel (local dev, the
 * test suite, and SQL Server deployments) the driver is left alone and Prisma
 * connects normally.
 */
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createClient(): PrismaClient {
  const log: ("error" | "warn")[] = isProduction ? ["error"] : ["error", "warn"];

  // Only over Postgres, and only where the platform freezes containers.
  const url = process.env.DATABASE_URL ?? "";
  const useNeonAdapter = url.startsWith("postgres") && Boolean(process.env.VERCEL);

  if (useNeonAdapter) {
    return new PrismaClient({ adapter: new PrismaNeon({ connectionString: url }), log });
  }

  return new PrismaClient({ log });
}

export const prisma = globalForPrisma.prisma ?? createClient();

if (!isProduction) {
  globalForPrisma.prisma = prisma;
}
