// Shared database connection for the seed scripts. Same rules as src/lib/prisma.ts:
// TLS certificates are verified unless the database is local, and seeding is
// refused in production unless ALLOW_SEED=true.
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env.local") });
require("dotenv").config({ path: path.join(__dirname, "../.env") });
const { Pool } = require("pg");

if (process.env.NODE_ENV === "production" && process.env.ALLOW_SEED !== "true") {
  console.error("Refusing to seed: NODE_ENV is production. Set ALLOW_SEED=true if you really mean it.");
  process.exit(1);
}

function poolConfig(rawUrl) {
  if (!rawUrl) throw new Error("DATABASE_URL is not set");
  const url = new URL(rawUrl);
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

module.exports = { pool: new Pool(poolConfig(process.env.DATABASE_URL)) };
