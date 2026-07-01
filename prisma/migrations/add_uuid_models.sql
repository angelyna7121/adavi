-- Migration: Add UUID-based Prisma models
-- Tables: app_users, app_user_profiles, subscriptions, activity_logs, notifications
-- These are NEW tables alongside the existing Drizzle-managed tables.

-- Enable pgcrypto for gen_random_uuid() if not already available
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ── app_users ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS app_users (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  email         TEXT        NOT NULL UNIQUE,
  display_name  TEXT,
  avatar_url    TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── app_user_profiles ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS app_user_profiles (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL UNIQUE REFERENCES app_users(id) ON DELETE CASCADE,
  first_name  TEXT,
  last_name   TEXT,
  phone       TEXT,
  timezone    TEXT        NOT NULL DEFAULT 'America/Toronto',
  locale      TEXT        NOT NULL DEFAULT 'en-CA',
  province    TEXT        NOT NULL DEFAULT 'ON',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── subscriptions ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS subscriptions (
  id                     UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                UUID        NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  plan                   TEXT        NOT NULL DEFAULT 'free',
  status                 TEXT        NOT NULL DEFAULT 'active',
  stripe_customer_id     TEXT        UNIQUE,
  stripe_subscription_id TEXT        UNIQUE,
  current_period_start   TIMESTAMPTZ,
  current_period_end     TIMESTAMPTZ,
  cancelled_at           TIMESTAMPTZ,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── activity_logs ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS activity_logs (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID        NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  action         TEXT        NOT NULL,
  resource_type  TEXT,
  resource_id    TEXT,
  metadata       JSONB,
  ip_address     TEXT,
  user_agent     TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_activity_logs_user_id   ON activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON activity_logs(created_at DESC);

-- ── notifications ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS notifications (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  type        TEXT        NOT NULL,
  title       TEXT        NOT NULL,
  body        TEXT,
  read        BOOLEAN     NOT NULL DEFAULT FALSE,
  read_at     TIMESTAMPTZ,
  action_url  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read    ON notifications(user_id, read);
