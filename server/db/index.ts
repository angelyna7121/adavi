import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "@shared/schema";
import { database } from "../config";

const { Pool } = pg;

export const pool = new Pool({ connectionString: database.url });
export const db = drizzle(pool, { schema });
