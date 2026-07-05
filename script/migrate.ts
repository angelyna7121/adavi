import { runMigrations } from "../server/db/migrate";
import { pool } from "../server/db";

try {
  await runMigrations();
} finally {
  await pool.end();
}
