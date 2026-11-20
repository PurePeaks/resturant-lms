import "dotenv/config";
import { Pool, type PoolConfig } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  pgPool: Pool | undefined;
};

/**
 * TLS settings for the database connection. Certificates are verified by
 * default (Neon uses publicly trusted certificates). `sslmode` is stripped from
 * the URL because pg lets it override this config, and `sslmode=require`
 * would silently turn verification off. Local databases connect without TLS.
 */
export function poolConfig(rawUrl: string | undefined): PoolConfig {
  if (!rawUrl) return {};

  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return { connectionString: rawUrl };
  }

  const sslmode = url.searchParams.get("sslmode");
  url.searchParams.delete("sslmode");
  const isLocal = ["localhost", "127.0.0.1", "::1"].includes(url.hostname);

  if (sslmode === "disable" || (isLocal && sslmode === null)) {
    return { connectionString: url.toString(), ssl: false };
  }

  return {
    connectionString: url.toString(),
    ssl: { rejectUnauthorized: process.env.DATABASE_SSL_REJECT_UNAUTHORIZED !== "false" },
  };
}

const pool = globalForPrisma.pgPool ?? new Pool(poolConfig(process.env.DATABASE_URL));

const adapter = new PrismaPg(pool);

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
  globalForPrisma.pgPool = pool;
}
