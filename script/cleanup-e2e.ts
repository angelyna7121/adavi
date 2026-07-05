import pg from "pg";
import { database } from "../server/config";

const { Pool } = pg;
const runId = process.env.E2E_RUN_ID;

if (!runId) {
  console.log("[e2e-cleanup] E2E_RUN_ID is not set; skipping cleanup.");
  process.exit(0);
}

const pool = new Pool({ connectionString: database.url });

try {
  const { rows } = await pool.query<{ id: number }>(
    `
      SELECT id
      FROM users
      WHERE email LIKE $1 OR email LIKE $2
    `,
    [`free.networth.${runId}.%@example.com`, `paid.networth.${runId}.%@example.com`],
  );

  if (rows.length === 0) {
    console.log(`[e2e-cleanup] No test users found for run ${runId}.`);
  } else {
    const ids = rows.map((row) => row.id);
    await pool.query("BEGIN");
    await pool.query("DELETE FROM analytics_events WHERE user_id = ANY($1::int[])", [ids]);
    await pool.query("DELETE FROM reports WHERE user_id = ANY($1::int[])", [ids]);
    await pool.query("DELETE FROM report_snapshots WHERE user_id = ANY($1::int[])", [ids]);
    await pool.query("DELETE FROM investor_profiles WHERE user_id = ANY($1::int[])", [ids]);
    await pool.query("DELETE FROM annotations WHERE user_id = ANY($1::int[])", [ids]);
    await pool.query("DELETE FROM ai_extractions WHERE user_id = ANY($1::int[])", [ids]);
    await pool.query("DELETE FROM uploaded_documents WHERE user_id = ANY($1::int[])", [ids]);
    await pool.query("DELETE FROM net_worth_items WHERE user_id = ANY($1::int[])", [ids]);
    await pool.query("DELETE FROM net_worth_statements WHERE user_id = ANY($1::int[])", [ids]);
    await pool.query("DELETE FROM income_strategies WHERE user_id = ANY($1::int[])", [ids]);
    await pool.query("DELETE FROM scenarios WHERE user_id = ANY($1::int[])", [ids]);
    await pool.query("DELETE FROM user_profiles WHERE user_id = ANY($1::int[])", [ids]);
    await pool.query("DELETE FROM users WHERE id = ANY($1::int[])", [ids]);
    await pool.query("COMMIT");
    console.log(`[e2e-cleanup] Removed ${ids.length} test user(s) for run ${runId}.`);
  }
} catch (err) {
  await pool.query("ROLLBACK").catch(() => null);
  throw err;
} finally {
  await pool.end();
}
