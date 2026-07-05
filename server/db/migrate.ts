import { pool } from "./index";

export async function runMigrations() {
  const client = await pool.connect();
  try {
    await client.query(`
      -- Users
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email TEXT NOT NULL UNIQUE,
        password_hash TEXT,
        google_id TEXT UNIQUE,
        stripe_customer_id TEXT UNIQUE,
        stripe_subscription_id TEXT,
        subscription_status TEXT NOT NULL DEFAULT 'free',
        plan_type TEXT,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      );

      -- Express session store used by connect-pg-simple.
      -- Keep this here so Vercel's bundled server does not need connect-pg-simple/table.sql at runtime.
      CREATE TABLE IF NOT EXISTS "session" (
        "sid" varchar NOT NULL COLLATE "default",
        "sess" json NOT NULL,
        "expire" timestamp(6) NOT NULL,
        CONSTRAINT "session_pkey" PRIMARY KEY ("sid") NOT DEFERRABLE INITIALLY IMMEDIATE
      );
      CREATE INDEX IF NOT EXISTS "IDX_session_expire" ON "session" ("expire");

      -- User Profiles
      CREATE TABLE IF NOT EXISTS user_profiles (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL UNIQUE REFERENCES users(id),
        first_name TEXT,
        last_name TEXT,
        business_type TEXT,
        province TEXT DEFAULT 'ON',
        income_range TEXT,
        onboarding_completed BOOLEAN NOT NULL DEFAULT FALSE,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      );

      -- Add firstName/lastName to user_profiles if missing
      ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS first_name TEXT;
      ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS last_name TEXT;

      -- Scenarios (legacy)
      CREATE TABLE IF NOT EXISTS scenarios (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        title TEXT NOT NULL,
        corporate_revenue INTEGER NOT NULL DEFAULT 0,
        corporate_expenses INTEGER NOT NULL DEFAULT 0,
        salary_amount INTEGER NOT NULL DEFAULT 0,
        dividend_amount INTEGER NOT NULL DEFAULT 0,
        province TEXT NOT NULL DEFAULT 'ON',
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      );

      -- Net Worth Statements
      CREATE TABLE IF NOT EXISTS net_worth_statements (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id),
        title TEXT NOT NULL DEFAULT 'My Net Worth',
        total_assets INTEGER NOT NULL DEFAULT 0,
        total_liabilities INTEGER NOT NULL DEFAULT 0,
        net_worth INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      );

      -- Net Worth Items
      CREATE TABLE IF NOT EXISTS net_worth_items (
        id SERIAL PRIMARY KEY,
        statement_id INTEGER NOT NULL REFERENCES net_worth_statements(id) ON DELETE CASCADE,
        user_id INTEGER NOT NULL REFERENCES users(id),
        type TEXT NOT NULL,
        category TEXT NOT NULL,
        name TEXT NOT NULL,
        amount INTEGER NOT NULL DEFAULT 0,
        notes TEXT,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      );

      -- Income Strategies (saved)
      CREATE TABLE IF NOT EXISTS income_strategies (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id),
        title TEXT NOT NULL,
        province TEXT NOT NULL DEFAULT 'ON',
        corporate_profit INTEGER NOT NULL DEFAULT 0,
        desired_cash_withdrawal INTEGER NOT NULL DEFAULT 0,
        grip_balance INTEGER,
        wants_cpp_rrsp TEXT,
        prefer_simple BOOLEAN NOT NULL DEFAULT FALSE,
        salary_recommendation INTEGER,
        dividend_recommendation INTEGER,
        blended_note TEXT,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      );

      -- Uploaded Documents
      CREATE TABLE IF NOT EXISTS uploaded_documents (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id),
        original_name TEXT NOT NULL,
        stored_path TEXT,
        file_type TEXT NOT NULL,
        file_size INTEGER,
        status TEXT NOT NULL DEFAULT 'uploaded',
        document_type TEXT,
        extracted_text TEXT,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
      ALTER TABLE uploaded_documents ADD COLUMN IF NOT EXISTS stored_path TEXT;

      -- AI Extractions (append-only raw OpenAI response log)
      CREATE TABLE IF NOT EXISTS ai_extractions (
        id           SERIAL PRIMARY KEY,
        document_id  INTEGER NOT NULL REFERENCES uploaded_documents(id) ON DELETE CASCADE,
        user_id      INTEGER NOT NULL REFERENCES users(id),
        model        TEXT NOT NULL,
        raw_response TEXT NOT NULL,
        item_count   INTEGER NOT NULL DEFAULT 0,
        created_at   TIMESTAMP NOT NULL DEFAULT NOW()
      );

      -- Reports
      CREATE TABLE IF NOT EXISTS reports (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id),
        report_type TEXT NOT NULL,
        title TEXT NOT NULL,
        reference_id INTEGER,
        status TEXT NOT NULL DEFAULT 'generated',
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      );

      -- Annotations (user corrections made during import review)
      CREATE TABLE IF NOT EXISTS annotations (
        id              SERIAL PRIMARY KEY,
        user_id         INTEGER NOT NULL REFERENCES users(id),
        document_id     INTEGER REFERENCES uploaded_documents(id) ON DELETE CASCADE,
        temp_id         TEXT,
        field_name      TEXT NOT NULL,
        original_value  TEXT,
        corrected_value TEXT,
        annotation_type TEXT NOT NULL,
        notes           TEXT,
        created_at      TIMESTAMP NOT NULL DEFAULT NOW()
      );

      -- Waitlist
      CREATE TABLE IF NOT EXISTS waitlist_emails (
        id SERIAL PRIMARY KEY,
        email TEXT NOT NULL UNIQUE,
        source TEXT NOT NULL DEFAULT 'landing',
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      );

      -- Analytics Events
      CREATE TABLE IF NOT EXISTS analytics_events (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        event_name TEXT NOT NULL,
        metadata TEXT,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);
    console.log("[migrate] Schema up to date.");
  } finally {
    client.release();
  }
}
