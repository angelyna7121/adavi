# Adavi

**AI-powered compensation strategy optimizer for Canadian incorporated professionals (CCPC).**

Adavi helps business owners inside a Canadian corporation (CCPC) visualize and optimize their salary vs. dividend split — showing the full two-layer tax picture (corporate + personal) in real time. It is an educational tool, not tax or financial advice.

Live domain: **adiva.ai**

---

## Table of Contents

1. [What Adavi Does](#what-adavi-does)
2. [Tech Stack](#tech-stack)
3. [Folder Structure](#folder-structure)
4. [How to Run Locally](#how-to-run-locally)
5. [Environment Variables](#environment-variables)
6. [Database & Migrations](#database--migrations)
7. [Stripe Setup](#stripe-setup)
8. [Google OAuth Setup](#google-oauth-setup)
9. [OpenAI Setup](#openai-setup)
10. [File Upload & Storage](#file-upload--storage)
11. [Access Model & Feature Flags](#access-model--feature-flags)
12. [Deployment](#deployment)
13. [Launch Checklist](#launch-checklist)

---

## What Adavi Does

Canadian professionals who incorporate (CCPC) must decide each year how much to pay themselves as salary vs. how much to leave in the company and withdraw as dividends. The optimal split depends on CPP obligations, personal income brackets, corporate SBD tax rate, RRSP room, and more — making it genuinely hard to optimize manually.

Adavi solves this with:

- **Income strategy calculator** — interactive salary slider that recomputes net personal cash, total tax burden, and after-tax corporate pool in real time using 2025 Ontario two-layer tax rules.
- **Net worth tracker** — assets and liabilities with CSV import and AI-powered document extraction (bank/brokerage PDFs).
- **Scenario saving** — authenticated users save and compare unlimited compensation plans.
- **Pro features** — PDF/CPA export, AI explanations, optimization insights (`$8.99/month` or `$89/year`).
- **Demo mode** — fully functional, no account required, no artificial limits.

**Legal boundary:** All output is qualified as an estimate under current Canadian tax rules. Nothing in the UI constitutes financial or tax advice.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, TypeScript, Vite |
| Routing | Wouter |
| Data fetching | TanStack Query v5 |
| UI components | shadcn/ui + Tailwind CSS |
| Animations | Framer Motion |
| Backend | Express.js, TypeScript, tsx |
| Database | PostgreSQL |
| ORM | Drizzle ORM + drizzle-zod |
| Auth | Passport.js (local + Google OAuth 2.0), express-session, connect-pg-simple |
| Payments | Stripe (Checkout + webhooks) |
| AI | OpenAI GPT-4o (document extraction) |
| File parsing | PDF.js, Tesseract.js OCR, csv-parser |
| Password hashing | Node.js built-in `crypto.scrypt` |

---

## Folder Structure

```
adavi/
│
├── client/                     # React frontend (Vite)
│   ├── index.html
│   ├── public/                 # Static assets (favicon, robots.txt, sitemap.xml)
│   └── src/
│       ├── App.tsx             # Route declarations (Wouter)
│       ├── components/         # Shared UI components
│       │   └── layout/         # Navigation, Footer, AppLayout
│       ├── hooks/              # Custom React hooks (use-auth, use-scenarios, …)
│       ├── lib/                # Utilities (financialCalcs, analytics, queryClient, design tokens)
│       └── pages/              # One file per route
│
├── server/                     # Express backend
│   ├── index.ts                # App entry point — session, passport, middleware, startup
│   ├── config.ts               # All env var access lives here (single source of truth)
│   ├── static.ts               # Production static file serving
│   ├── vite.ts                 # Vite dev middleware (development only)
│   ├── api/
│   │   └── routes.ts           # All API route handlers
│   ├── ai/                     # AI document extraction pipeline
│   │   ├── classificationEngine.ts
│   │   ├── financialDocumentExtractor.ts
│   │   ├── csvParser.ts
│   │   ├── ocrParser.ts
│   │   ├── pdfParser.ts
│   │   └── prompts/            # GPT prompt templates
│   ├── auth/
│   │   ├── index.ts            # Passport strategies + serialize/deserialize
│   │   └── crypto.ts           # scrypt password hashing
│   ├── db/
│   │   ├── migrate.ts          # Auto-migration runner (runs at startup)
│   │   └── prisma.ts           # DB connection health check
│   ├── lib/
│   │   └── errorHandler.ts     # Express error + 404 handlers
│   └── services/
│       └── storage.ts          # IStorage interface + DatabaseStorage (all DB access)
│
├── shared/
│   └── schema.ts               # Drizzle schema + Zod types shared by client and server
│
├── prisma/
│   └── migrations/             # SQL migration files
│
├── script/
│   └── build.ts                # Production build script
│
├── drizzle.config.ts           # Drizzle Kit config (schema path, dialect, credentials)
├── tailwind.config.ts
├── tsconfig.json
├── vite.config.ts
└── package.json
```

---

## How to Run Locally

### Prerequisites

- **Node.js** 20+
- **PostgreSQL** 15+ (local install or a cloud instance — Neon, Supabase, Railway all work)
- A `.env` file (or environment variables) — see [Environment Variables](#environment-variables)

### Steps

```bash
# 1. Clone
git clone https://github.com/angelyna7121/adavi.git
cd adavi

# 2. Install dependencies
npm install

# 3. Create .env (copy the template below and fill in values)
cp .env.example .env   # or create manually — see Environment Variables section

# 4. Push the database schema
npm run db:push

# 5. Start the development server
npm run dev
```

The server starts on **http://localhost:5000**. Both the Express API and the Vite dev server are served from the same port — no proxy setup needed.

### Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server (Express + Vite HMR) |
| `npm run build` | Compile TypeScript and bundle for production |
| `npm start` | Run the compiled production server |
| `npm run check` | TypeScript type-check (no emit) |
| `npm run db:push` | Push schema changes to the database (dev) |

---

## Environment Variables

All server-side environment access is centralized in **`server/config.ts`**. Never access `process.env` directly in any other server file.

Create a `.env` file in the project root (never commit it):

```dotenv
# ── Required ──────────────────────────────────────────────────────────────────

# PostgreSQL connection string
DATABASE_URL=postgresql://user:password@localhost:5432/adavi

# Session signing secret — use a strong random string (≥ 32 chars)
# Generate one: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
SESSION_SECRET=replace_with_a_long_random_string

# ── Google OAuth (optional — email/password login works without it) ────────────

GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
# Only needed if you want to override the auto-detected callback URL:
# GOOGLE_CALLBACK_URL=https://yourdomain.com/api/auth/google/callback

# ── Stripe (optional — Pro subscriptions require this) ────────────────────────

STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRO_MONTHLY_PRICE_ID=price_...
STRIPE_PRO_ANNUAL_PRICE_ID=price_...

# ── OpenAI (optional — AI document extraction requires this) ──────────────────

OPENAI_API_KEY=sk-...

# ── App (optional — defaults shown) ──────────────────────────────────────────

# Your production URL — used to build OAuth callback URLs and email links
PUBLIC_APP_URL=https://adiva.ai

# Port (default: 5000)
# PORT=5000

# ── File Storage (optional — defaults to local disk) ──────────────────────────

# STORAGE_PROVIDER=local        # or "s3" for S3-compatible storage
# UPLOAD_DIR=./uploads          # local upload directory
# MAX_FILE_SIZE_MB=10

# S3 / Cloudflare R2 (only if STORAGE_PROVIDER=s3):
# S3_BUCKET=
# S3_REGION=ca-central-1
# S3_ACCESS_KEY_ID=
# S3_SECRET_ACCESS_KEY=
# S3_ENDPOINT=                  # leave blank for AWS; set for R2/custom endpoints
```

### Variable Reference

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | **Yes** | PostgreSQL connection string |
| `SESSION_SECRET` | **Yes** | Random string ≥ 32 chars — signs session cookies |
| `GOOGLE_CLIENT_ID` | No | Google OAuth 2.0 client ID |
| `GOOGLE_CLIENT_SECRET` | No | Google OAuth 2.0 client secret |
| `GOOGLE_CALLBACK_URL` | No | Override callback URL (auto-built from `PUBLIC_APP_URL` if not set) |
| `STRIPE_SECRET_KEY` | No | Stripe secret key (`sk_live_…` in production) |
| `STRIPE_WEBHOOK_SECRET` | No | Stripe webhook signing secret (`whsec_…`) |
| `STRIPE_PRO_MONTHLY_PRICE_ID` | No | Stripe Price ID for $8.99/month plan |
| `STRIPE_PRO_ANNUAL_PRICE_ID` | No | Stripe Price ID for $89/year plan |
| `OPENAI_API_KEY` | No | OpenAI API key — disables AI extraction if missing |
| `PUBLIC_APP_URL` | No | Production URL, e.g. `https://adiva.ai` |
| `PORT` | No | HTTP port (default: `5000`) |
| `STORAGE_PROVIDER` | No | `local` (default) or `s3` |
| `UPLOAD_DIR` | No | Local upload directory (default: `./uploads`) |
| `MAX_FILE_SIZE_MB` | No | Max upload size in MB (default: `10`) |
| `S3_BUCKET` | No | S3/R2 bucket name (required if `STORAGE_PROVIDER=s3`) |
| `S3_REGION` | No | AWS region (default: `ca-central-1`) |
| `S3_ACCESS_KEY_ID` | No | S3/R2 access key |
| `S3_SECRET_ACCESS_KEY` | No | S3/R2 secret key |
| `S3_ENDPOINT` | No | Custom S3 endpoint URL (for Cloudflare R2 or non-AWS) |

---

## Database & Migrations

Adavi uses **Drizzle ORM** with PostgreSQL. The schema lives in `shared/schema.ts` — it is the single source of truth for both database structure and TypeScript types.

### Applying Schema Changes (Development)

```bash
npm run db:push
```

This introspects `shared/schema.ts` and pushes any changes directly to the database. It is non-destructive for additive changes (new columns, new tables). Use it in development.

### Automatic Migrations (Production)

The server runs `server/db/migrate.ts` automatically at startup before accepting requests. Migration files live in `prisma/migrations/`. You do not need to run migrations manually on deploy — they run on boot.

### Schema Overview

| Table | Purpose |
|-------|---------|
| `users` | Auth accounts (email/password or Google OAuth) |
| `user_profiles` | Onboarding data (province, business type, income range) |
| `scenarios` | Saved compensation plans per user |
| `net_worth_statements` | Net worth snapshot header per user |
| `net_worth_items` | Individual assets and liabilities |
| `income_strategies` | Saved income strategy configurations |
| `uploaded_documents` | File upload metadata |
| `reports` | Generated PDF report metadata |
| `waitlist_emails` | Email capture for Professional plan waitlist |
| `analytics_events` | Server-side event log |
| `session` | connect-pg-simple session store (auto-created) |

---

## Stripe Setup

Adavi uses Stripe Checkout for Pro subscriptions and Stripe webhooks for subscription lifecycle management.

### 1. Create Products and Prices

In the [Stripe Dashboard](https://dashboard.stripe.com) → Products:

1. Create a product: **"Adavi Pro"**
2. Add a recurring price: **$8.99 CAD / month** → copy the Price ID → `STRIPE_PRO_MONTHLY_PRICE_ID`
3. Add a recurring price: **$89.00 CAD / year** → copy the Price ID → `STRIPE_PRO_ANNUAL_PRICE_ID`

### 2. Create a Webhook Endpoint

In Stripe Dashboard → Developers → Webhooks → Add endpoint:

- **URL:** `https://yourdomain.com/api/stripe-webhook`
- **Events to listen for:**
  - `checkout.session.completed`
  - `customer.subscription.created`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`
  - `invoice.payment_failed`
  - `invoice.payment_succeeded`

Copy the **Signing secret** → `STRIPE_WEBHOOK_SECRET`

### 3. Set Environment Variables

```dotenv
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRO_MONTHLY_PRICE_ID=price_...
STRIPE_PRO_ANNUAL_PRICE_ID=price_...
```

### 4. Test Locally with Stripe CLI

```bash
# Forward webhook events to your local server
stripe listen --forward-to localhost:5000/api/stripe-webhook

# Trigger a test checkout
stripe trigger checkout.session.completed
```

Use test card **4242 4242 4242 4242** (any future expiry, any CVC) for test checkouts.

### Subscription Status Mapping

Stripe statuses are normalized to four internal statuses:

| Stripe status | Internal status |
|---------------|-----------------|
| `active`, `trialing` | `active` |
| `past_due`, `incomplete`, `unpaid` | `past_due` |
| `canceled`, `incomplete_expired` | `canceled` |
| anything else | `free` |

---

## Google OAuth Setup

Google OAuth enables "Sign in with Google". Email/password login works independently — you can skip this for local development.

### 1. Create OAuth Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com) → APIs & Services → Credentials
2. Create an **OAuth 2.0 Client ID** → Application type: **Web application**
3. Add to **Authorized redirect URIs:**
   ```
   http://localhost:5000/api/auth/google/callback       # local dev
   https://yourdomain.com/api/auth/google/callback      # production
   ```
4. Copy the **Client ID** and **Client Secret**

### 2. Set Environment Variables

```dotenv
GOOGLE_CLIENT_ID=your_client_id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_client_secret
```

The callback URL is auto-constructed as `{PUBLIC_APP_URL}/api/auth/google/callback`. Override it with `GOOGLE_CALLBACK_URL` if needed.

### Auth Flow

```
New user:      Google OAuth → /api/auth/google/callback → /onboarding → /dashboard
Returning user: Google OAuth → /api/auth/google/callback → /dashboard
```

---

## OpenAI Setup

OpenAI powers the AI document extraction feature — users can upload bank statements or brokerage PDFs and the AI parses them into structured net worth items.

Without an API key, the upload UI still works and CSV imports still function — only AI-powered PDF/image parsing is disabled.

### Setup

1. Create an API key at [platform.openai.com/api-keys](https://platform.openai.com/api-keys)
2. Set the environment variable:

```dotenv
OPENAI_API_KEY=sk-proj-...
```

### Models Used

| Feature | Model |
|---------|-------|
| Document extraction (PDF/image → structured JSON) | `gpt-4o` |
| CSV column classification | `gpt-4o-mini` |

The extraction pipeline lives in `server/ai/financialDocumentExtractor.ts`. Prompts are in `server/ai/prompts/`.

---

## File Upload & Storage

Uploaded documents (PDFs, images, CSVs) are stored either on local disk or in S3-compatible object storage.

### Local Storage (Default)

Files are written to `./uploads/` (configurable via `UPLOAD_DIR`). **Local storage does not persist across deployments** — use S3 for production.

### S3 / Cloudflare R2

```dotenv
STORAGE_PROVIDER=s3
S3_BUCKET=your-bucket-name
S3_REGION=ca-central-1
S3_ACCESS_KEY_ID=your_key
S3_SECRET_ACCESS_KEY=your_secret
S3_ENDPOINT=https://your-account-id.r2.cloudflarestorage.com   # R2 only
```

Leave `S3_ENDPOINT` blank for standard AWS S3. Set it for Cloudflare R2 or any S3-compatible service.

---

## Access Model & Feature Flags

| Tier | Who | What they get |
|------|-----|---------------|
| **Demo** | Anonymous | Full calculator, all sliders, no account required |
| **Free** | Signed-in users | Unlimited scenarios, net worth tracking |
| **Pro** | `subscriptionStatus = "active"` | PDF/CPA export, AI explanations, tax update alerts |
| **Professional** | Waitlist | Multi-client CPA dashboard (not yet built) |

Feature gating is checked via `user.subscriptionStatus === "active"` on both client and server. There are no hard limits for free authenticated users — the upgrade prompt is a soft upsell, not a paywall.

**Copy rule:** Never display "Most professionals save $X,XXX/year" — this is a legal risk. Use: *"Potential savings vary by income, CPP, RRSP room, dividend type, and corporate tax assumptions."*

---

## Deployment

### Build

```bash
npm run build
```

This compiles TypeScript and bundles the frontend into `dist/`. The output is a single Node.js process that serves both the API and the static frontend.

### Start (Production)

```bash
NODE_ENV=production node dist/index.cjs
```

Or with the npm script:

```bash
npm start
```

### Environment

Set `NODE_ENV=production` on your hosting platform. This enables:
- Secure cookies (`httpOnly: true`, `sameSite: lax`, `secure: true`)
- Static file serving from `dist/public/`
- Suppressed verbose error details in API responses

### Replit

The project is configured for Replit deployment. Click **Deploy** in the Replit UI — it runs `npm run build` then `npm start` automatically.

### Fly.io / Railway / Render

1. Set all required environment variables in the platform's secrets/env panel
2. Set the build command: `npm run build`
3. Set the start command: `NODE_ENV=production node dist/index.cjs`
4. Provision a PostgreSQL database and set `DATABASE_URL`
5. Migrations run automatically on first boot

### Health Check

`GET /api/auth/me` returns `null` for unauthenticated requests with a `200` — suitable as a health check endpoint.

---

## Launch Checklist

Before going live, visit **`/admin/launch`** — it auto-checks:

- Database connectivity and schema
- Session secret strength
- Google OAuth configuration
- Stripe keys and webhook registration
- OpenAI key presence
- `NODE_ENV=production`
- `PUBLIC_APP_URL` set
- File storage provider

It also has 14 manual test flow checklists (browser-localStorage-persisted) and a full environment variable reference with one-click copy buttons.

---

## Tax Calculation Notes (for future developers)

The core financial logic lives in `client/src/lib/financialCalcs.ts`. It is the **single source of truth** — never duplicate tax rate logic elsewhere.

Key model decisions:

- **Dividends are derived, not an input.** The user sets salary; dividends are `max(0, corporateTaxableIncome × (1 − 0.122))` from the after-tax corporate pool only.
- **CPP is split 50/50** between employer (deducted from corporate income) and employee (deducted from personal cash).
- **All rates are 2025 Ontario indexed values.** Federal brackets: 15% / 20.5% / 26% / 29% / 33%. Ontario: 5.05% / 9.15% / 11.16% / 12.16% / 13.16%.
- **Corporate SBD rate: 12.2%** on net corporate income (revenue − expenses − salary − employerCPP).
- **Dividend tax** uses 6 income-sensitive effective rates (8% to 39%) based on total personal income.

All disclaimers must read: *"2025 indexed Canadian tax rules (Ontario)"*

---

## Contributing

1. All database changes go through `shared/schema.ts` — never write raw SQL migrations by hand
2. All server-side `process.env` access goes through `server/config.ts` — never access it directly in route handlers
3. All database queries go through `server/services/storage.ts` — routes stay thin
4. Client-side env vars must be prefixed with `VITE_` and accessed via `import.meta.env.VITE_*`
5. Security: every user-owned resource query must include `userId` in the SQL WHERE clause (IDOR prevention)

---

*Adavi is an educational tool. It does not constitute financial or tax advice. Always consult a qualified CPA for personalized tax planning.*
