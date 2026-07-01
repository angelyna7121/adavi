# Adavi — Compensation Strategy Optimizer

**Domain:** adiva.ai  
**Browser Tab:** "AI-powered compensation decisions for Canadian business owners."

## Overview

Adavi is an educational SaaS tool for Canadian incorporated professionals (CCPC) to visualize and optimize salary vs. dividend compensation strategies. It is qualitative/educational only — not tax or financial advice.

## Access Model

- **Demo (anonymous):** Truly unlimited — no slider limits, no trial counts, no gating. Free forever.
- **Account (free):** Unlimited calculations + ability to save scenarios
- **Pro ($8.99/month or $89/year):** Save unlimited scenarios, optimization insights, PDF/CPA exports, AI explanations, tax update alerts
- **Professional (waitlist):** Multi-client firm dashboard for CPAs and bookkeepers

## Copy Rules
- Do NOT use "Most professionals save $3,000–$8,000/year" — this is a legal risk.
- Instead use: "Potential savings vary by income, CPP, RRSP room, dividend type, and corporate tax assumptions."
- All demo/calculator usage must be unlimited and unblocked for anonymous users.

## Tech Stack

- **Frontend:** React 18, TypeScript, Vite, Wouter (routing), TanStack Query v5, Framer Motion, shadcn/ui, Tailwind CSS
- **Backend:** Express.js, TypeScript, tsx
- **Database:** PostgreSQL (Drizzle ORM)
- **Auth:** Passport.js (local strategy + Google OAuth), express-session, connect-pg-simple (PostgreSQL session store), Node.js built-in `crypto.scrypt` for password hashing

## Route Structure

| Path | Description | Protected |
|------|-------------|-----------|
| `/` | SaaS landing page (dark theme) | No |
| `/login` | Login page | No |
| `/signup` | Signup page (→ /onboarding after signup) | No |
| `/onboarding` | Post-signup onboarding flow | **Yes** |
| `/pricing` | Informational pricing page (free account CTA) | No |
| `/about` | Methodology explanation | No |
| `/demo` | Public demo with real calculations (3 free moves) | No |
| `/admin/launch` | Dev-only launch checklist | No (dev only) |
| `/dashboard` | User's compensation plans (unlimited) | **Yes** |
| `/visualizer/:id` | Main optimizer (full breakdown unlocked) | **Yes** |
| `/visualizer/:id/hierarchy` | Variant: visual hierarchy | **Yes** |
| `/visualizer/:id/interaction` | Variant: interaction focus | **Yes** |
| `/visualizer/:id/accessible` | Variant: accessibility focus | **Yes** |

## Data Model

### `users`
- `id` (serial PK)
- `email` (text, unique)
- `passwordHash` (text, nullable — Google users have no password)
- `googleId` (text, nullable)
- `createdAt` (timestamp)

### `user_profiles` (onboarding)
- `id` (serial PK)
- `userId` (integer, FK → users.id, unique)
- `businessType` (text, optional)
- `province` (text, default "ON")
- `incomeRange` (text, optional)
- `onboardingCompleted` (boolean, default false)
- `createdAt` (timestamp)

### `scenarios` (Compensation Plans)
- `id` (serial PK)
- `userId` (integer, FK → users.id)
- `title`, `corporateRevenue`, `corporateExpenses`, `salaryAmount`, `dividendAmount`, `province`
- `createdAt`, `updatedAt` (timestamps)

### `waitlist_emails`
- `id` (serial PK)
- `email` (text, unique)
- `source` (text — e.g. "landing", "landing-email-section")
- `createdAt` (timestamp)

### `analytics_events`
- `id` (serial PK)
- `userId` (integer, FK → users.id, nullable)
- `eventName` (text)
- `metadata` (text, JSON string)
- `createdAt` (timestamp)

## Key Files

- `shared/schema.ts` — Drizzle schema + Zod types for all tables
- `server/auth.ts` — Passport.js setup (local + Google strategy + serialize/deserialize)
- `server/crypto.ts` — Password hashing with Node.js `crypto.scrypt`
- `server/storage.ts` — Database access layer (IStorage interface + DatabaseStorage)
- `server/routes.ts` — API route handlers (auth, onboarding, scenarios, waitlist, analytics)
- `server/index.ts` — Express app setup (session, passport, middleware)
- `client/src/lib/financialCalcs.ts` — Shared tax calculation utilities (source of truth)
- `client/src/lib/analytics.ts` — Client-side analytics event tracker (fires POST /api/analytics/event)
- `client/src/hooks/use-auth.ts` — Auth hook (login, signup→/onboarding, logout, current user)
- `client/src/hooks/use-scenarios.ts` — Scenario CRUD hooks (TanStack Query)
- `client/src/lib/protected-route.tsx` — Route guard (redirect to /login if unauthenticated)
- `client/src/components/Navigation.tsx` — Top nav with account dropdown
- `client/src/components/CreateScenarioDialog.tsx` — Create plan dialog
- `client/src/components/UpgradeModal.tsx` — Soft paywall: "Create Free Account" sign-up prompt
- `client/src/pages/Dashboard.tsx` — User's plans (unlimited, no gating)
- `client/src/pages/Visualizer.tsx` — Main optimizer page (full breakdown unlocked for all authenticated users)
- `client/src/pages/Landing.tsx` — Dark-themed SaaS landing (hero, Why Adavi, email capture, CTAs)
- `client/src/pages/Demo.tsx` — Public demo with real tax calculations (3 free moves for anonymous users)
- `client/src/pages/Onboarding.tsx` — Post-signup setup (province, businessType, incomeRange)
- `client/src/pages/LaunchChecklist.tsx` — Dev-only launch progress checklist
- `client/src/pages/Pricing.tsx` — Informational pricing page (Demo vs Free Account comparison)
- `client/src/pages/About.tsx` — Methodology and disclaimer

## API Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | /api/auth/me | No | Returns `{...SafeUser, profile}` or null |
| POST | /api/auth/signup | No | Creates user + blank profile, returns user |
| POST | /api/auth/login | No | Authenticates, returns `{...SafeUser, profile}` |
| POST | /api/auth/logout | No | Destroys session |
| GET | /api/auth/providers | No | Returns `{google: boolean}` |
| GET | /api/auth/google | No | Google OAuth entry |
| GET | /api/auth/google/callback | No | Google OAuth callback |
| GET | /api/onboarding | Yes | Get user's profile |
| POST | /api/onboarding | Yes | Save onboarding data, set onboardingCompleted=true |
| GET | /api/scenarios | Yes | List user's scenarios (unlimited) |
| GET | /api/scenarios/:id | Yes | Get single scenario |
| POST | /api/scenarios | Yes | Create scenario (unlimited for all authenticated users) |
| PUT | /api/scenarios/:id | Yes | Update scenario |
| DELETE | /api/scenarios/:id | Yes | Delete scenario |
| POST | /api/waitlist | No | Add email to waitlist |
| POST | /api/analytics/event | No | Track analytics event |

## Business Logic

### Access Gating
- **Anonymous users on Demo:** 3 free slider moves → `GateOverlay` appears with "Create Free Account" CTA, `UpgradeModal` opens as soft paywall
- **Authenticated users:** Unlimited everything — no plan limits, no feature locks
- **UpgradeModal:** Redesigned as sign-up prompt (no payment UI). Shows features, "Create Free Account" button → `/signup`

### Tax Calculations (financialCalcs.ts) — 2025 Ontario Two-Layer Model
- `calculateFinancials({ revenue, expenses, salary })` → full tax breakdown (dividends are **derived**, not an input)
  - `employerCPP = totalCPP / 2` deducted from corporate taxable income
  - `corporateTaxableIncome = max(0, netIncome − salary − employerCPP)`
  - `dividends = max(0, corporateTaxableIncome × (1 − 0.122))` — from after-tax corporate pool only
  - `employeeCPP = totalCPP / 2` deducted from personal side
  - `netPersonalCash = salary + dividends − salaryTax − dividendTax − employeeCPP`
  - `totalTaxBurden = corpTax + salaryTax + dividendTax + employeeCPP + employerCPP`
- `computeMix(revenue, expenses, salaryPct)` → `{ salary, dividends }` where dividends are derived from calculateFinancials (not gross allocation)
- `optimizeCompensation(revenue, expenses)` → loops 0–100% salary, maximises `netPersonalCash`, returns recommended split + gain
- **Federal brackets (2025):** 15% / 20.5% / 26% / 29% / 33% with $15,705 basic personal credit
- **Ontario brackets (2025):** 5.05% / 9.15% / 11.16% / 12.16% / 13.16% with $12,000 basic personal credit
- **CPP (2025):** combined employee+employer rate 11.9%, max pensionable earnings $68,500; split 50/50
- **Dividend tax:** 6-tier income-sensitive effective rates — 8% (≤$50k), 15% (≤$100k), 22% (≤$150k), 28% (≤$200k), 34% (≤$300k), 39% (>$300k) based on total personal income
- **Corporate SBD:** 12.2% on net corp income (revenue − expenses − salary − employerCPP)
- All disclaimers read "2025 indexed Canadian tax rules (Ontario)"

### Analytics Events
- `analytics.track(eventName)` fires `POST /api/analytics/event`
- Events: landing_page_view, demo_view, signup_started/completed, login_completed, onboarding_started/completed, waitlist_joined, plan_created, upgrade_clicked, pricing_view

### Auth Flow
1. Signup → user created + blank profile created → redirect to `/onboarding`
2. Onboarding → profile fields saved, `onboardingCompleted=true` → redirect to `/dashboard`
3. Login → redirect to `/dashboard`
4. Google OAuth → new users go to `/onboarding`, returning users go to `/dashboard`
5. `GET /api/auth/me` returns `{...SafeUser, profile}` or `null`

## UI Notes

- Landing page: dark slate theme (matches the SaaS brand)
- Other pages: light theme using shadcn defaults
- Navigation: auth-aware (account dropdown when logged in, Log In/Sign Up when logged out)
- All protected pages redirect to `/login` if not authenticated
- Demo page: public, shows real computed example — never shows user data; auto-animates slider on load without consuming free moves
- Disclaimer footer on every page: "This tool provides estimates based on current Canadian tax rules and does not constitute financial or tax advice."
- Brand: "Adavi" in UI, "adiva.ai" in footer
