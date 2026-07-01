import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  CheckCircle2, XCircle, AlertCircle, RefreshCw, Zap,
  Database, Lock, CreditCard, Bot, Globe, HardDrive,
  FileText, FlaskConical, ChevronRight, Copy, Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  BG, CARD, CARD2, GOLD, GOLD_BORDER, GOLD_BG, GOLD_BG2,
  BORDER, BORDER2, MUTED, DIM, GREEN, RED, YELLOW, SILVER,
} from "@/lib/design";

// ── Types ─────────────────────────────────────────────────────────────────────

interface LaunchStatus {
  timestamp: string;
  environment: string;
  checks: {
    database:    { urlSet: boolean; connected: boolean; tablesExist: boolean };
    session:     { secretSet: boolean };
    google:      { clientIdSet: boolean; clientSecretSet: boolean; callbackUrlSet: boolean; configured: boolean };
    stripe:      { secretKeySet: boolean; webhookSecretSet: boolean; monthlyPriceIdSet: boolean; annualPriceIdSet: boolean; configured: boolean };
    openai:      { apiKeySet: boolean; configured: boolean };
    app:         { publicUrlSet: boolean; nodeEnv: string; isProduction: boolean };
    fileStorage: { provider: string; maxFileSizeMb: number; s3Configured: boolean };
  };
}

// ── Status atom ───────────────────────────────────────────────────────────────

type Status = "pass" | "warn" | "fail";

function StatusIcon({ status, size = 16 }: { status: Status; size?: number }) {
  if (status === "pass") return <CheckCircle2 style={{ color: GREEN, width: size, height: size, flexShrink: 0 }} />;
  if (status === "warn") return <AlertCircle   style={{ color: YELLOW, width: size, height: size, flexShrink: 0 }} />;
  return                         <XCircle       style={{ color: RED,    width: size, height: size, flexShrink: 0 }} />;
}

function StatusBadge({ status }: { status: Status }) {
  const map = {
    pass: { label: "Pass",    bg: "rgba(74,222,128,0.1)",  border: "rgba(74,222,128,0.3)",  color: GREEN  },
    warn: { label: "Warning", bg: "rgba(250,204,21,0.1)",  border: "rgba(250,204,21,0.3)",  color: YELLOW },
    fail: { label: "Missing", bg: "rgba(248,113,113,0.1)", border: "rgba(248,113,113,0.3)", color: RED    },
  };
  const s = map[status];
  return (
    <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
      style={{ background: s.bg, border: `1px solid ${s.border}`, color: s.color }}>
      {s.label}
    </span>
  );
}

// ── CheckRow ─────────────────────────────────────────────────────────────────

function CheckRow({ label, status, note }: { label: string; status: Status; note?: string }) {
  return (
    <div className="flex items-start gap-3 py-2.5 border-b last:border-0"
      style={{ borderColor: BORDER }}>
      <StatusIcon status={status} size={16} />
      <div className="flex-1 min-w-0">
        <span className="text-sm text-white">{label}</span>
        {note && <p className="text-xs mt-0.5" style={{ color: MUTED }}>{note}</p>}
      </div>
      <StatusBadge status={status} />
    </div>
  );
}

// ── SectionCard ───────────────────────────────────────────────────────────────

function SectionCard({
  icon: Icon, title, subtitle, children, score,
}: {
  icon: React.ElementType; title: string; subtitle: string;
  children: React.ReactNode; score: { pass: number; total: number };
}) {
  const allPass = score.pass === score.total;
  const someWarn = !allPass && score.pass > 0;
  const iconColor = allPass ? GREEN : someWarn ? YELLOW : RED;
  const iconBg    = allPass ? "rgba(74,222,128,0.1)" : someWarn ? "rgba(250,204,21,0.1)" : "rgba(248,113,113,0.1)";

  return (
    <div className="rounded-2xl border" style={{ background: CARD, borderColor: BORDER }}>
      <div className="flex items-start gap-3 p-5 border-b" style={{ borderColor: BORDER }}>
        <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: iconBg }}>
          <Icon className="w-4 h-4" style={{ color: iconColor }} />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-white text-sm">{title}</h3>
            <span className="text-xs px-1.5 py-0.5 rounded-md font-mono"
              style={{ background: CARD2, color: allPass ? GREEN : MUTED }}>
              {score.pass}/{score.total}
            </span>
          </div>
          <p className="text-xs mt-0.5" style={{ color: MUTED }}>{subtitle}</p>
        </div>
      </div>
      <div className="px-5 py-1">{children}</div>
    </div>
  );
}

// ── Manual test flows ────────────────────────────────────────────────────────

const MANUAL_FLOWS = [
  { id: "signup_email",      label: "Email signup → onboarding → dashboard", detail: "Create a fresh account with email + password and verify the full onboarding flow completes." },
  { id: "signup_google",     label: "Google OAuth signup → onboarding → dashboard", detail: "Sign up via Google OAuth on a fresh browser profile. Verify callback URL resolves correctly." },
  { id: "login_existing",    label: "Email login with an existing account", detail: "Log in with a previously created account and confirm redirect to /dashboard." },
  { id: "income_strategy",   label: "Income strategy calculator renders and computes", detail: "Enter corp revenue + expenses and slide the salary split. Confirm net personal cash updates in real time." },
  { id: "net_worth_add",     label: "Add / edit / delete a net worth item", detail: "Add an asset and a liability manually. Edit the amount. Delete one. Confirm totals recalculate." },
  { id: "file_csv",          label: "CSV upload → import review → items added", detail: "Upload a sample CSV with Description + Amount columns. Complete the import review and verify items appear in net worth." },
  { id: "stripe_checkout",   label: "Stripe test checkout launches (use test card 4242 4242 4242 4242)", detail: "Click Upgrade → Pro and complete a Stripe test checkout. Confirm subscription status changes to 'active' on return." },
  { id: "stripe_webhook",    label: "Stripe webhook fires on subscription.created", detail: "Check server logs to confirm the webhook handler receives and processes customer.subscription.created after test checkout." },
  { id: "pdf_export",        label: "PDF report exports and renders correctly", detail: "Open a saved net worth or income strategy report and download the PDF. Verify layout, numbers, and branding are correct." },
  { id: "data_export",       label: "Data export downloads as JSON", detail: "Go to Data & Privacy → Export my data. Confirm the JSON download includes all scenarios, net worth, and strategies." },
  { id: "account_delete",    label: "Account deletion removes all data", detail: "Create a test account, add data, then delete it. Confirm the user row and all associated rows are gone from the database." },
  { id: "mobile_layout",     label: "Mobile layout correct on 375 px viewport", detail: "Use browser DevTools at 375 × 812 (iPhone SE). Check every page: nav, cards, sliders, tables — nothing overflows." },
  { id: "privacy_pages",     label: "Privacy, Terms, Disclaimer, Security pages load", detail: "Visit /privacy, /terms, /disclaimer, /security, /trust-center. Confirm all pages render with correct content." },
  { id: "error_boundary",    label: "Error boundary shows friendly message (not stack trace)", detail: "Temporarily break a component import to trigger the error boundary. Confirm no stack trace is visible to the user." },
];

const STORAGE_KEY = "adavi_launch_checklist";

function ManualFlowsSection() {
  const [checked, setChecked] = useState<Record<string, boolean>>(() => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}"); } catch { return {}; }
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(checked));
  }, [checked]);

  const toggle = (id: string) => setChecked(prev => ({ ...prev, [id]: !prev[id] }));
  const reset  = () => setChecked({});

  const doneCount = Object.values(checked).filter(Boolean).length;
  const allDone   = doneCount === MANUAL_FLOWS.length;

  return (
    <div className="rounded-2xl border" style={{ background: CARD, borderColor: BORDER }}>
      <div className="flex items-start gap-3 p-5 border-b" style={{ borderColor: BORDER }}>
        <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: allDone ? "rgba(74,222,128,0.1)" : GOLD_BG2 }}>
          <FlaskConical className="w-4 h-4" style={{ color: allDone ? GREEN : GOLD }} />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-white text-sm">Manual Test Flows</h3>
            <span className="text-xs px-1.5 py-0.5 rounded-md font-mono"
              style={{ background: CARD2, color: allDone ? GREEN : MUTED }}>
              {doneCount}/{MANUAL_FLOWS.length}
            </span>
          </div>
          <p className="text-xs mt-0.5" style={{ color: MUTED }}>
            Checked items are saved in your browser. Reset when starting a fresh pre-launch run.
          </p>
        </div>
        <button onClick={reset} className="text-xs px-3 py-1.5 rounded-lg transition-colors"
          style={{ background: CARD2, color: MUTED, border: `1px solid ${BORDER}` }}
          onMouseEnter={e => (e.currentTarget.style.color = SILVER)}
          onMouseLeave={e => (e.currentTarget.style.color = MUTED)}>
          Reset all
        </button>
      </div>

      <div className="divide-y" style={{ borderColor: BORDER }}>
        {MANUAL_FLOWS.map(flow => (
          <label key={flow.id}
            className="flex items-start gap-3 px-5 py-3.5 cursor-pointer group transition-colors"
            style={{ borderColor: BORDER }}
            onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.02)")}
            onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
            <div className="mt-0.5 shrink-0">
              <input type="checkbox" className="sr-only" checked={!!checked[flow.id]}
                onChange={() => toggle(flow.id)} />
              <div className="w-4.5 h-4.5 w-[18px] h-[18px] rounded-md border-2 flex items-center justify-center transition-all"
                style={{
                  borderColor: checked[flow.id] ? GREEN : BORDER2,
                  background:  checked[flow.id] ? "rgba(74,222,128,0.15)" : "transparent",
                }}>
                {checked[flow.id] && <Check className="w-2.5 h-2.5" style={{ color: GREEN }} strokeWidth={3} />}
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm transition-colors"
                style={{ color: checked[flow.id] ? MUTED : "white", textDecoration: checked[flow.id] ? "line-through" : "none" }}>
                {flow.label}
              </p>
              <p className="text-xs mt-0.5 leading-relaxed" style={{ color: DIM }}>{flow.detail}</p>
            </div>
          </label>
        ))}
      </div>
    </div>
  );
}

// ── Secret env var list ───────────────────────────────────────────────────────

const ENV_VARS = [
  { key: "DATABASE_URL",                  required: true,  desc: "PostgreSQL connection string" },
  { key: "SESSION_SECRET",                required: true,  desc: "Random string ≥ 32 chars for signing sessions" },
  { key: "STRIPE_SECRET_KEY",             required: false, desc: "Stripe secret key (sk_live_…)" },
  { key: "STRIPE_WEBHOOK_SECRET",         required: false, desc: "Stripe webhook signing secret (whsec_…)" },
  { key: "STRIPE_PRO_MONTHLY_PRICE_ID",   required: false, desc: "Stripe Price ID for monthly Pro plan" },
  { key: "STRIPE_PRO_ANNUAL_PRICE_ID",    required: false, desc: "Stripe Price ID for annual Pro plan" },
  { key: "GOOGLE_CLIENT_ID",              required: false, desc: "Google OAuth 2.0 client ID" },
  { key: "GOOGLE_CLIENT_SECRET",          required: false, desc: "Google OAuth 2.0 client secret" },
  { key: "GOOGLE_CALLBACK_URL",           required: false, desc: "Override for OAuth callback (optional if PUBLIC_APP_URL is set)" },
  { key: "OPENAI_API_KEY",                required: false, desc: "OpenAI API key for AI document extraction" },
  { key: "PUBLIC_APP_URL",                required: false, desc: "Your production URL, e.g. https://adiva.ai" },
];

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(text).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500); });
  };
  return (
    <button onClick={copy} className="p-1 rounded transition-opacity hover:opacity-80">
      {copied ? <Check className="w-3 h-3" style={{ color: GREEN }} /> : <Copy className="w-3 h-3" style={{ color: DIM }} />}
    </button>
  );
}

function EnvVarsReference() {
  return (
    <div className="rounded-2xl border" style={{ background: CARD, borderColor: BORDER }}>
      <div className="flex items-start gap-3 p-5 border-b" style={{ borderColor: BORDER }}>
        <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: GOLD_BG2 }}>
          <FileText className="w-4 h-4" style={{ color: GOLD }} />
        </div>
        <div>
          <h3 className="font-bold text-white text-sm">Environment Variables Reference</h3>
          <p className="text-xs mt-0.5" style={{ color: MUTED }}>
            Set these in the Replit Secrets tab (or your hosting platform's env config). Never commit them to source control.
          </p>
        </div>
      </div>
      <div className="divide-y" style={{ borderColor: BORDER }}>
        {ENV_VARS.map(v => (
          <div key={v.key} className="flex items-start gap-3 px-5 py-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <code className="text-xs font-mono px-1.5 py-0.5 rounded"
                  style={{ background: CARD2, color: GOLD, border: `1px solid ${GOLD_BORDER}` }}>
                  {v.key}
                </code>
                {v.required && (
                  <span className="text-xs px-1.5 py-0.5 rounded-full font-semibold"
                    style={{ background: "rgba(248,113,113,0.1)", color: RED, border: "1px solid rgba(248,113,113,0.3)" }}>
                    Required
                  </span>
                )}
              </div>
              <p className="text-xs mt-1" style={{ color: MUTED }}>{v.desc}</p>
            </div>
            <CopyButton text={v.key} />
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Legal pages quick-links ───────────────────────────────────────────────────

const LEGAL_PAGES = [
  { path: "/privacy",      label: "Privacy Policy" },
  { path: "/terms",        label: "Terms of Service" },
  { path: "/disclaimer",   label: "Disclaimer" },
  { path: "/security",     label: "Security" },
  { path: "/trust-center", label: "Trust Center" },
  { path: "/contact",      label: "Contact" },
  { path: "/faq",          label: "FAQ" },
];

// ── Main page ─────────────────────────────────────────────────────────────────

export default function LaunchChecklist() {
  const { data, isLoading, isError, dataUpdatedAt, refetch, isFetching } =
    useQuery<LaunchStatus>({
      queryKey: ["/api/admin/launch-status"],
      staleTime: 0,
      refetchOnMount: true,
    });

  const c = data?.checks;

  // Flatten all auto-checks into a pass/fail count
  const autoChecks: Status[] = c ? [
    c.database.urlSet       ? "pass" : "fail",
    c.database.connected    ? "pass" : "fail",
    c.database.tablesExist  ? "pass" : "fail",
    c.session.secretSet     ? "pass" : "fail",
    c.google.clientIdSet    ? "pass" : "warn",
    c.google.clientSecretSet? "pass" : "warn",
    c.google.callbackUrlSet ? "pass" : "warn",
    c.stripe.secretKeySet      ? "pass" : "warn",
    c.stripe.webhookSecretSet  ? "pass" : "warn",
    c.stripe.monthlyPriceIdSet ? "pass" : "warn",
    c.stripe.annualPriceIdSet  ? "pass" : "warn",
    c.openai.apiKeySet         ? "pass" : "warn",
    c.app.publicUrlSet         ? "pass" : "warn",
    c.app.isProduction         ? "pass" : "warn",
  ] : [];

  const totalPass    = autoChecks.filter(s => s === "pass").length;
  const totalChecks  = autoChecks.length;
  const pct          = totalChecks > 0 ? Math.round((totalPass / totalChecks) * 100) : 0;
  const overallReady = totalPass === totalChecks;
  const overallColor = overallReady ? GREEN : pct >= 60 ? YELLOW : RED;

  const lastChecked = dataUpdatedAt
    ? new Date(dataUpdatedAt).toLocaleTimeString("en-CA", { hour: "2-digit", minute: "2-digit", second: "2-digit" })
    : null;

  const score = (keys: Status[]) => ({ pass: keys.filter(s => s === "pass").length, total: keys.length });

  return (
    <div className="min-h-screen" style={{ background: BG, fontFamily: "Calibri, Arial, sans-serif" }}>
      <div className="container mx-auto px-4 py-10 max-w-4xl">

        {/* ── Header ── */}
        <div className="flex items-start justify-between gap-4 mb-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: GOLD_BG2 }}>
              <Zap className="w-5 h-5" style={{ color: GOLD }} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Production Launch Checklist</h1>
              <p className="text-sm mt-0.5" style={{ color: MUTED }}>
                adavi.ai — verify every system before going live
              </p>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1 shrink-0">
            <Button size="sm" variant="outline"
              onClick={() => refetch()}
              disabled={isFetching}
              className="border-white/10 text-white hover:bg-white/5">
              <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${isFetching ? "animate-spin" : ""}`} />
              {isFetching ? "Checking…" : "Re-check"}
            </Button>
            {lastChecked && (
              <span className="text-xs" style={{ color: DIM }}>Last checked {lastChecked}</span>
            )}
          </div>
        </div>

        {/* ── Overall readiness ── */}
        {!isLoading && !isError && data && (
          <div className="rounded-2xl border p-5 mb-8"
            style={{ background: CARD, borderColor: overallReady ? "rgba(74,222,128,0.25)" : BORDER }}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <StatusIcon status={overallReady ? "pass" : pct >= 60 ? "warn" : "fail"} size={20} />
                <div>
                  <p className="font-bold text-white">
                    {overallReady ? "All systems ready" : `${totalPass} of ${totalChecks} checks passing`}
                  </p>
                  <p className="text-xs" style={{ color: MUTED }}>
                    Environment: <span className="font-mono"
                      style={{ color: data.environment === "production" ? GREEN : YELLOW }}>
                      {data.environment}
                    </span>
                    {" · "}
                    Checked at {new Date(data.timestamp).toLocaleTimeString("en-CA")}
                  </p>
                </div>
              </div>
              <span className="text-2xl font-bold font-mono" style={{ color: overallColor }}>
                {pct}%
              </span>
            </div>
            {/* Progress bar */}
            <div className="h-2 rounded-full overflow-hidden" style={{ background: CARD2 }}>
              <div className="h-full rounded-full transition-all duration-500"
                style={{ width: `${pct}%`, background: overallColor }} />
            </div>
          </div>
        )}

        {/* ── Loading / error states ── */}
        {isLoading && (
          <div className="flex items-center gap-3 rounded-2xl border p-8 mb-8"
            style={{ background: CARD, borderColor: BORDER }}>
            <RefreshCw className="w-5 h-5 animate-spin" style={{ color: GOLD }} />
            <span style={{ color: MUTED }}>Running checks…</span>
          </div>
        )}
        {isError && (
          <div className="rounded-2xl border p-6 mb-8"
            style={{ background: CARD, borderColor: "rgba(248,113,113,0.3)" }}>
            <div className="flex items-center gap-2 mb-1">
              <XCircle className="w-5 h-5" style={{ color: RED }} />
              <span className="font-bold text-white">Could not reach the status endpoint</span>
            </div>
            <p className="text-sm" style={{ color: MUTED }}>
              Make sure the server is running and <code className="font-mono text-xs px-1 rounded"
                style={{ background: CARD2, color: GOLD }}>/api/admin/launch-status</code> is accessible.
            </p>
          </div>
        )}

        {c && (
          <div className="space-y-4">

            {/* ── 1. Core Infrastructure ── */}
            <SectionCard icon={Database} title="Core Infrastructure"
              subtitle="Database connectivity and session security — required for all functionality."
              score={score([
                c.database.urlSet      ? "pass" : "fail",
                c.database.connected   ? "pass" : "fail",
                c.database.tablesExist ? "pass" : "fail",
                c.session.secretSet    ? "pass" : "fail",
              ])}>
              <CheckRow label="DATABASE_URL is set" status={c.database.urlSet ? "pass" : "fail"}
                note="Required. PostgreSQL connection string." />
              <CheckRow label="Database connection successful" status={c.database.connected ? "pass" : "fail"}
                note={c.database.connected ? "Server can reach the database." : "Check DATABASE_URL and that the database is running."} />
              <CheckRow label="Schema tables exist" status={c.database.tablesExist ? "pass" : "fail"}
                note={c.database.tablesExist ? "Core tables are present." : "Run database migrations: npm run db:push"} />
              <CheckRow label="SESSION_SECRET is set" status={c.session.secretSet ? "pass" : "fail"}
                note="Required. Use a strong random string (≥ 32 chars)." />
            </SectionCard>

            {/* ── 2. Google OAuth ── */}
            <SectionCard icon={Lock} title="Google OAuth"
              subtitle="Enables social sign-in. Optional — email/password login always works without it."
              score={score([
                c.google.clientIdSet     ? "pass" : "warn",
                c.google.clientSecretSet ? "pass" : "warn",
                c.google.callbackUrlSet  ? "pass" : "warn",
              ])}>
              <CheckRow label="GOOGLE_CLIENT_ID is set" status={c.google.clientIdSet ? "pass" : "warn"}
                note="OAuth 2.0 Client ID from Google Cloud Console." />
              <CheckRow label="GOOGLE_CLIENT_SECRET is set" status={c.google.clientSecretSet ? "pass" : "warn"}
                note="OAuth 2.0 Client Secret from Google Cloud Console." />
              <CheckRow
                label="Callback URL configured (GOOGLE_CALLBACK_URL or PUBLIC_APP_URL)"
                status={c.google.callbackUrlSet ? "pass" : "warn"}
                note={c.google.callbackUrlSet
                  ? "Callback URL is resolvable."
                  : "Set PUBLIC_APP_URL=https://yourdomain.com or GOOGLE_CALLBACK_URL explicitly."} />
              {c.google.configured && (
                <div className="mt-2 p-3 rounded-xl text-xs" style={{ background: CARD2, color: MUTED }}>
                  <strong className="text-white">Authorized redirect URI to add in Google Cloud Console:</strong><br />
                  <code className="font-mono" style={{ color: GOLD }}>
                    {"https://yourdomain.com/api/auth/google/callback"}
                  </code>
                </div>
              )}
            </SectionCard>

            {/* ── 3. Stripe Payments ── */}
            <SectionCard icon={CreditCard} title="Stripe Payments"
              subtitle="Required for Pro subscriptions. Use live keys for production."
              score={score([
                c.stripe.secretKeySet      ? "pass" : "warn",
                c.stripe.webhookSecretSet  ? "pass" : "warn",
                c.stripe.monthlyPriceIdSet ? "pass" : "warn",
                c.stripe.annualPriceIdSet  ? "pass" : "warn",
              ])}>
              <CheckRow label="STRIPE_SECRET_KEY is set" status={c.stripe.secretKeySet ? "pass" : "warn"}
                note="Use sk_live_… in production. sk_test_… for testing." />
              <CheckRow label="STRIPE_WEBHOOK_SECRET is set" status={c.stripe.webhookSecretSet ? "pass" : "warn"}
                note="Required for subscription lifecycle events (cancel, renew, etc.)." />
              <CheckRow label="STRIPE_PRO_MONTHLY_PRICE_ID is set" status={c.stripe.monthlyPriceIdSet ? "pass" : "warn"}
                note="Stripe Price ID for the $8.99/month plan." />
              <CheckRow label="STRIPE_PRO_ANNUAL_PRICE_ID is set" status={c.stripe.annualPriceIdSet ? "pass" : "warn"}
                note="Stripe Price ID for the $89/year plan." />
              {c.stripe.configured && (
                <div className="mt-2 p-3 rounded-xl text-xs" style={{ background: CARD2, color: MUTED }}>
                  <strong className="text-white">Stripe webhook endpoint to register:</strong><br />
                  <code className="font-mono" style={{ color: GOLD }}>
                    {"https://yourdomain.com/api/stripe/webhook"}
                  </code>
                  <br /><span className="mt-1 block">Events: customer.subscription.created, .updated, .deleted, invoice.payment_failed</span>
                </div>
              )}
            </SectionCard>

            {/* ── 4. OpenAI ── */}
            <SectionCard icon={Bot} title="AI Features (OpenAI)"
              subtitle="Powers AI document extraction for uploaded PDFs and statements. Optional."
              score={score([c.openai.apiKeySet ? "pass" : "warn"])}>
              <CheckRow label="OPENAI_API_KEY is set" status={c.openai.apiKeySet ? "pass" : "warn"}
                note={c.openai.apiKeySet
                  ? "AI extraction is enabled."
                  : "Without this key, PDF/image parsing is disabled. CSV import still works."} />
            </SectionCard>

            {/* ── 5. App Configuration ── */}
            <SectionCard icon={Globe} title="App Configuration"
              subtitle="Public URL and runtime environment affect OAuth callbacks, email links, and security headers."
              score={score([
                c.app.publicUrlSet  ? "pass" : "warn",
                c.app.isProduction  ? "pass" : "warn",
              ])}>
              <CheckRow label="PUBLIC_APP_URL is set" status={c.app.publicUrlSet ? "pass" : "warn"}
                note="Set to your production domain, e.g. https://adiva.ai" />
              <CheckRow
                label={`NODE_ENV = production`}
                status={c.app.isProduction ? "pass" : "warn"}
                note={c.app.isProduction
                  ? "Running in production mode."
                  : `Currently '${c.app.nodeEnv}'. Set NODE_ENV=production on your hosting platform.`} />
            </SectionCard>

            {/* ── 6. File Upload ── */}
            <SectionCard icon={HardDrive} title="File Upload Configuration"
              subtitle="Controls where uploaded documents are stored and size limits."
              score={score([
                c.fileStorage.provider === "s3"
                  ? c.fileStorage.s3Configured ? "pass" : "warn"
                  : "pass",
                c.fileStorage.maxFileSizeMb >= 5 ? "pass" : "warn",
              ])}>
              <CheckRow
                label={`Storage provider: ${c.fileStorage.provider}`}
                status={c.fileStorage.provider === "s3" ? (c.fileStorage.s3Configured ? "pass" : "warn") : "pass"}
                note={c.fileStorage.provider === "s3"
                  ? c.fileStorage.s3Configured
                    ? "S3/R2 is configured — files persist across deployments."
                    : "STORAGE_PROVIDER=s3 but S3_BUCKET / S3_ACCESS_KEY_ID / S3_SECRET_ACCESS_KEY are missing."
                  : "Using local disk storage. For persistent production deployments, consider switching to S3 or Cloudflare R2."} />
              <CheckRow
                label={`Max file size: ${c.fileStorage.maxFileSizeMb} MB`}
                status={c.fileStorage.maxFileSizeMb >= 5 ? "pass" : "warn"}
                note={c.fileStorage.maxFileSizeMb < 5
                  ? "Very low limit — users may not be able to upload typical bank statements."
                  : "Override with MAX_FILE_SIZE_MB env var if needed."} />
            </SectionCard>

            {/* ── 7. Legal & Privacy Pages ── */}
            <div className="rounded-2xl border" style={{ background: CARD, borderColor: BORDER }}>
              <div className="flex items-start gap-3 p-5 border-b" style={{ borderColor: BORDER }}>
                <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: "rgba(74,222,128,0.1)" }}>
                  <FileText className="w-4 h-4" style={{ color: GREEN }} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-white text-sm">Legal & Privacy Pages</h3>
                    <span className="text-xs px-1.5 py-0.5 rounded-md font-mono"
                      style={{ background: CARD2, color: GREEN }}>
                      {LEGAL_PAGES.length}/{LEGAL_PAGES.length}
                    </span>
                  </div>
                  <p className="text-xs mt-0.5" style={{ color: MUTED }}>
                    All pages are registered as routes in the app. Click to verify each renders correctly.
                  </p>
                </div>
              </div>
              <div className="p-5 grid grid-cols-2 sm:grid-cols-3 gap-2">
                {LEGAL_PAGES.map(p => (
                  <a key={p.path} href={p.path} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm transition-colors group"
                    style={{ background: CARD2, color: SILVER, border: `1px solid ${BORDER}` }}
                    onMouseEnter={e => (e.currentTarget.style.borderColor = GOLD_BORDER)}
                    onMouseLeave={e => (e.currentTarget.style.borderColor = BORDER)}>
                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0" style={{ color: GREEN }} />
                    {p.label}
                    <ChevronRight className="w-3 h-3 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: GOLD }} />
                  </a>
                ))}
              </div>
            </div>

          </div>
        )}

        {/* ── Manual test flows ── */}
        <div className="mt-4">
          <ManualFlowsSection />
        </div>

        {/* ── Env vars reference ── */}
        <div className="mt-4">
          <EnvVarsReference />
        </div>

        {/* ── Footer note ── */}
        <p className="text-center text-xs mt-8" style={{ color: DIM }}>
          This page is admin-only. Do not share or link it publicly. Accessed at{" "}
          <code className="font-mono" style={{ color: GOLD }}>/admin/launch</code>
        </p>

      </div>
    </div>
  );
}
