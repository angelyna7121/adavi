/**
 * server/config.ts
 *
 * Single source of truth for all server-side environment configuration.
 *
 * Rules:
 *  - NEVER import this file from any client-side code.
 *  - All process.env access lives here. Server modules import named exports.
 *  - Call validateConfig() at startup to catch missing required vars early.
 *  - Optional vars have typed defaults so callers don't need null-checks.
 */

// ── Helpers ───────────────────────────────────────────────────────────────────

function required(key: string): string {
  const val = process.env[key];
  if (!val) throw new Error(`[config] Missing required environment variable: ${key}`);
  return val;
}

function optional(key: string, fallback: string): string;
function optional(key: string): string | undefined;
function optional(key: string, fallback?: string): string | undefined {
  return process.env[key] ?? fallback;
}

function optionalInt(key: string, fallback: number): number {
  const raw = process.env[key];
  if (!raw) return fallback;
  const n = parseInt(raw, 10);
  return isNaN(n) ? fallback : n;
}

// ── Database ──────────────────────────────────────────────────────────────────

export const database = {
  url: required("DATABASE_URL"),
} as const;

// ── Session ───────────────────────────────────────────────────────────────────

export const sessionConfig = {
  secret: required("SESSION_SECRET"),
  maxAgeMs: 30 * 24 * 60 * 60 * 1000,
} as const;

// ── Google OAuth ──────────────────────────────────────────────────────────────

export const google = {
  clientId:     optional("GOOGLE_CLIENT_ID"),
  clientSecret: optional("GOOGLE_CLIENT_SECRET"),
  callbackUrl:  optional("GOOGLE_CALLBACK_URL"),
  get configured() {
    return !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
  },
} as const;

// ── Stripe ────────────────────────────────────────────────────────────────────

export const stripeConfig = {
  secretKey:      optional("STRIPE_SECRET_KEY"),
  webhookSecret:  optional("STRIPE_WEBHOOK_SECRET"),
  monthlyPriceId: optional("STRIPE_PRO_MONTHLY_PRICE_ID"),
  annualPriceId:  optional("STRIPE_PRO_ANNUAL_PRICE_ID"),
  get configured() { return !!process.env.STRIPE_SECRET_KEY; },
} as const;

// ── OpenAI ────────────────────────────────────────────────────────────────────

export const openaiConfig = {
  apiKey: optional("OPENAI_API_KEY"),
  get configured() { return !!process.env.OPENAI_API_KEY; },
} as const;

// ── File Storage ──────────────────────────────────────────────────────────────
//
// STORAGE_PROVIDER: "local" (default) | "s3"
// For local:  UPLOAD_DIR, MAX_FILE_SIZE_MB
// For S3/R2:  S3_BUCKET, S3_REGION, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY,
//             S3_ENDPOINT (optional — Cloudflare R2 / custom endpoint)

export const fileStorage = {
  provider:       (optional("STORAGE_PROVIDER", "local") as "local" | "s3"),
  uploadDir:      optional("UPLOAD_DIR", "./uploads"),
  maxFileSizeMb:  optionalInt("MAX_FILE_SIZE_MB", 10),
  s3: {
    bucket:          optional("S3_BUCKET"),
    region:          optional("S3_REGION", "ca-central-1"),
    accessKeyId:     optional("S3_ACCESS_KEY_ID"),
    secretAccessKey: optional("S3_SECRET_ACCESS_KEY"),
    endpoint:        optional("S3_ENDPOINT"),
  },
} as const;

// ── App / Server ──────────────────────────────────────────────────────────────

export const appConfig = {
  nodeEnv:       process.env.NODE_ENV ?? "development",
  port:          optionalInt("PORT", 5000),
  publicUrl:     optional("PUBLIC_APP_URL"),
  replitDomains: optional("REPLIT_DOMAINS", ""),
  get isDev()  { return process.env.NODE_ENV !== "production"; },
  get isProd() { return process.env.NODE_ENV === "production"; },
} as const;

// ── Startup validation ────────────────────────────────────────────────────────
//
// Call once at server startup. Throws for hard-required vars, warns for optional.

export function validateConfig(): void {
  const missing: string[] = [];

  if (!process.env.DATABASE_URL)   missing.push("DATABASE_URL");
  if (!process.env.SESSION_SECRET) missing.push("SESSION_SECRET");

  if (missing.length > 0) {
    throw new Error(
      `[config] Missing required environment variable(s): ${missing.join(", ")}\n` +
      "Add them in the Replit Secrets tab (or your .env file) before starting."
    );
  }

  if (!openaiConfig.configured) {
    console.warn("[config] OPENAI_API_KEY not set — AI features will be disabled.");
  }

  if (!stripeConfig.configured) {
    console.warn("[config] STRIPE_SECRET_KEY not set — payment features will be disabled.");
  }

  if (!google.configured) {
    console.warn("[config] GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET not set — Google OAuth disabled.");
  }

  if (fileStorage.provider === "s3" && !fileStorage.s3.bucket) {
    console.warn("[config] STORAGE_PROVIDER=s3 but S3_BUCKET is not set.");
  }
}
