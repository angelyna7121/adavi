-- Migration: Add UUID-based document, financial, and report models
-- Tables: doc_uploaded_documents, doc_ai_extractions, doc_annotations,
--         fw_net_worth_statements, fw_net_worth_items,
--         fw_income_strategies, fw_reports
-- All reference app_users via UUID FK (ON DELETE CASCADE).

-- ── doc_uploaded_documents ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS doc_uploaded_documents (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID        NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  file_name      TEXT        NOT NULL,
  file_type      TEXT        NOT NULL,
  file_size      INTEGER,
  storage_path   TEXT,
  status         TEXT        NOT NULL DEFAULT 'pending',
  document_type  TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_doc_uploaded_documents_user_id ON doc_uploaded_documents(user_id);

-- ── doc_ai_extractions ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS doc_ai_extractions (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id      UUID        NOT NULL REFERENCES doc_uploaded_documents(id) ON DELETE CASCADE,
  user_id          UUID        NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  model            TEXT        NOT NULL DEFAULT 'gpt-4o',
  raw_json         JSONB,
  confidence_score REAL,
  status           TEXT        NOT NULL DEFAULT 'pending',
  error            TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_doc_ai_extractions_document_id ON doc_ai_extractions(document_id);
CREATE INDEX IF NOT EXISTS idx_doc_ai_extractions_user_id     ON doc_ai_extractions(user_id);

-- ── doc_annotations ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS doc_annotations (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id      UUID        NOT NULL REFERENCES doc_uploaded_documents(id) ON DELETE CASCADE,
  extraction_id    UUID        REFERENCES doc_ai_extractions(id) ON DELETE SET NULL,
  user_id          UUID        NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  field_key        TEXT        NOT NULL,
  original_value   TEXT,
  corrected_value  TEXT        NOT NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_doc_annotations_document_id ON doc_annotations(document_id);
CREATE INDEX IF NOT EXISTS idx_doc_annotations_user_id     ON doc_annotations(user_id);

-- ── fw_net_worth_statements ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS fw_net_worth_statements (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID        NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  title             TEXT        NOT NULL DEFAULT 'My Net Worth',
  as_of_date        DATE,
  total_assets      INTEGER     NOT NULL DEFAULT 0,
  total_liabilities INTEGER     NOT NULL DEFAULT 0,
  net_worth         INTEGER     NOT NULL DEFAULT 0,
  document_id       UUID        REFERENCES doc_uploaded_documents(id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fw_net_worth_statements_user_id ON fw_net_worth_statements(user_id);

-- ── fw_net_worth_items ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS fw_net_worth_items (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  statement_id   UUID        NOT NULL REFERENCES fw_net_worth_statements(id) ON DELETE CASCADE,
  user_id        UUID        NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  type           TEXT        NOT NULL,
  category       TEXT        NOT NULL,
  name           TEXT        NOT NULL,
  amount         INTEGER     NOT NULL DEFAULT 0,
  notes          TEXT,
  extraction_id  UUID        REFERENCES doc_ai_extractions(id) ON DELETE SET NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fw_net_worth_items_statement_id ON fw_net_worth_items(statement_id);
CREATE INDEX IF NOT EXISTS idx_fw_net_worth_items_user_id      ON fw_net_worth_items(user_id);

-- ── fw_income_strategies ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS fw_income_strategies (
  id                      UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                 UUID        NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  title                   TEXT        NOT NULL,
  province                TEXT        NOT NULL DEFAULT 'ON',
  corporate_profit        INTEGER     NOT NULL DEFAULT 0,
  desired_cash_withdrawal INTEGER     NOT NULL DEFAULT 0,
  grip_balance            INTEGER,
  wants_cpp_rrsp          TEXT,
  prefer_simple           BOOLEAN     NOT NULL DEFAULT FALSE,
  salary_recommendation   INTEGER,
  dividend_recommendation INTEGER,
  blended_note            TEXT,
  document_id             UUID        REFERENCES doc_uploaded_documents(id) ON DELETE SET NULL,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fw_income_strategies_user_id ON fw_income_strategies(user_id);

-- ── fw_reports ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS fw_reports (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID        NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  report_type     TEXT        NOT NULL,
  title           TEXT        NOT NULL,
  status          TEXT        NOT NULL DEFAULT 'generated',
  reference_type  TEXT,
  reference_id    UUID,
  statement_id    UUID        REFERENCES fw_net_worth_statements(id) ON DELETE SET NULL,
  strategy_id     UUID        REFERENCES fw_income_strategies(id) ON DELETE SET NULL,
  document_id     UUID        REFERENCES doc_uploaded_documents(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fw_reports_user_id ON fw_reports(user_id);
