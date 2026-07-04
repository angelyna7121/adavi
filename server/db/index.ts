import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "@shared/schema";
import { database } from "../config";

const { Pool } = pg;

export const pool = new Pool({ connectionString: database.url });
export const db = drizzle(pool, { schema });

export async function checkDatabaseConnection(): Promise<void> {
  try {
    await pool.query("SELECT 1");
    console.log("[db] Database connection confirmed.");
  } catch (err: any) {
    console.error("[db] Database connection failed:", err?.message ?? err);
    throw new Error("Could not connect to the database. Check DATABASE_URL.");
  }
}
