import pg from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "@shared/schema";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  console.error("[FATAL] DATABASE_URL environment variable is not set. Exiting.");
  process.exit(1);
}

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Log connection errors instead of crashing with unreadable minified stack traces
pool.on("error", (err) => {
  console.error("[database] Unexpected pool error:", err.message);
});

export const db = drizzle(pool, { schema });
