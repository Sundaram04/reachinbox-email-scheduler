import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

import { env } from "../config/env";
import * as schema from "./schema";

export const pool = new Pool({
  connectionString: env.DATABASE_URL,
  max: env.DB_POOL_MAX,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
});

pool.on("error", (err) => {
  console.error("Unexpected error on idle DB client:", err.message);
});

export const db = drizzle({
  client: pool,
  schema,
});

export async function pingDb() {
  await db.execute(sql`select 1`);
}

export async function closeDb() {
  await pool.end();
}
