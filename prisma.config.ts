import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    // Development data only; the seed refuses to run in production.
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: process.env.DATABASE_URL || "postgresql://placeholder:placeholder@localhost:5432/placeholder",
    // Only needed to diff the migrations folder (CI checks migrations match the schema).
    shadowDatabaseUrl: process.env.SHADOW_DATABASE_URL,
  },
});
