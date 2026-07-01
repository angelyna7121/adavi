import { AppLayout } from "@/components/layout/AppLayout";
import { Shield, Lock, Server, Key, Check, Eye, AlertTriangle, Database, Globe, Mail } from "lucide-react";
import { Link } from "wouter";
import { useEffect } from "react";
import { CARD, GOLD, GOLD_BORDER, BORDER, MUTED, DIM, CARD2 } from "@/lib/design";

const practices = [
  {
    icon: Lock,
    title: "Cryptographic Password Hashing",
    desc: "All passwords are hashed using Node.js crypto.scrypt — a memory-hard key derivation function — with a unique random salt per user. Plaintext passwords are never stored, logged, or transmitted.",
  },
  {
    icon: Globe,
    title: "HTTPS / TLS Everywhere",
    desc: "All traffic between your browser and our servers is encrypted using TLS 1.2 or higher. There are no plain HTTP endpoints. HSTS is enforced to prevent protocol downgrade attacks.",
  },
  {
    icon: Server,
    title: "Server-Side Session Management",
    desc: "Sessions are stored server-side in PostgreSQL using connect-pg-simple. Session cookies are HTTP-only (inaccessible to JavaScript), SameSite=Strict (CSRF-protected), and expire automatically after inactivity.",
  },
  {
    icon: Key,
    title: "Google OAuth 2.0",
    desc: "Google sign-in uses the official OAuth 2.0 authorization code flow. We never see your Google password. We receive only your email address and a unique Google ID for account linking.",
  },
  {
    icon: Database,
    title: "Data Isolation",
    desc: "Each user's data is strictly isolated. API endpoints verify ownership of all resources before returning data. You cannot access another user's scenarios, reports, or financial inputs.",
  },
  {
    icon: Eye,
    title: "Minimal Data Collection",
    desc: "We do not collect banking credentials, SIN numbers, government IDs, or credit card data. Payment information is handled entirely by Stripe. We access only what is necessary to generate your educational estimates.",
  },
];

const notCollected = [
  "Social Insurance Numbers (SIN) or government-issued ID numbers",
  "Banking account numbers, routing numbers, or credentials",
  "Credit card or debit card numbers (Stripe handles all payments)",
  "CRA My Account login credentials or tax filing data",
  "Investment brokerage credentials or portfolio holdings",
  "Biometric data of any kind",
];

export default function Security() {
  useEffect(() => { document.title = "Security | adavi.ai"; }, []);

  return (
    <AppLayout>
      <main className="flex-1 max-w-4xl mx-auto w-full px-4 py-14 space-y-14">

        {/* Header */}
        <section className="text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border text-xs font-semibold"
            style={{ background: "rgba(197,163,90,0.08)", borderColor: GOLD_BORDER, color: GOLD }}>
            <Shield className="w-3.5 h-3.5" />Security
          </div>
          <h1 className="text-4xl font-bold text-white">Our Security Practices</h1>
          <p className="text-lg max-w-xl mx-auto leading-relaxed" style={{ color: MUTED }}>
            We implement industry-standard security measures to protect your account,
            your financial data, and your privacy at every layer of our platform.
          </p>
        </section>

        {/* Practices grid */}
        <div>
          <h2 className="text-xl font-bold text-white mb-5">How We Protect Your Data</h2>
          <div className="grid md:grid-cols-2 gap-5">
            {practices.map(p => (
              <div key={p.title} className="rounded-2xl border p-6" style={{ background: CARD, borderColor: BORDER }}>
                <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-4"
                  style={{ background: "rgba(197,163,90,0.12)" }}>
                  <p.icon className="w-5 h-5" style={{ color: GOLD }} />
                </div>
                <h3 className="text-base font-bold text-white mb-2">{p.title}</h3>
                <p className="text-sm leading-relaxed" style={{ color: MUTED }}>{p.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Architecture overview */}
        <div className="rounded-2xl border p-8" style={{ background: CARD, borderColor: BORDER }}>
          <h2 className="text-xl font-bold text-white mb-5">Application Architecture Security</h2>
          <div className="space-y-5">
            {[
              {
                title: "Backend API with strict auth middleware",
                desc: "All protected routes require a valid authenticated session. Unauthenticated requests return 401 before any data is accessed. Session tokens are validated on every request.",
              },
              {
                title: "Database access via ORM with parameterized queries",
                desc: "We use Drizzle ORM with PostgreSQL. All database queries use parameterized statements, preventing SQL injection attacks by design.",
              },
              {
                title: "Environment variable isolation",
                desc: "Database credentials, session secrets, OAuth keys, and Stripe keys are stored as encrypted environment variables — never hard-coded in source code or exposed to the frontend.",
              },
              {
                title: "Input validation on every API endpoint",
                desc: "All API request bodies are validated using Zod schemas before processing. Malformed or unexpected inputs are rejected with a 400 error before reaching the database layer.",
              },
            ].map(item => (
              <div key={item.title} className="flex items-start gap-4">
                <div className="w-2 h-2 rounded-full mt-2 shrink-0" style={{ background: GOLD }} />
                <div>
                  <p className="font-semibold text-white mb-1">{item.title}</p>
                  <p className="text-sm leading-relaxed" style={{ color: MUTED }}>{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* What we don't collect */}
        <div className="rounded-2xl border p-8" style={{ background: CARD, borderColor: BORDER }}>
          <h2 className="text-xl font-bold text-white mb-5">What We Never Collect</h2>
          <div className="space-y-3">
            {notCollected.map(c => (
              <div key={c} className="flex items-start gap-3 text-sm" style={{ color: MUTED }}>
                <Check className="w-4 h-4 shrink-0 mt-0.5" style={{ color: GOLD }} />
                {c}
              </div>
            ))}
          </div>
        </div>

        {/* Responsible disclosure */}
        <div className="rounded-2xl border p-8" style={{ background: CARD, borderColor: BORDER }}>
          <h2 className="text-xl font-bold text-white mb-4">Responsible Disclosure</h2>
          <p className="text-sm leading-relaxed mb-5" style={{ color: MUTED }}>
            If you discover a potential security vulnerability in adavi.ai, we ask that you report it to us
            responsibly before public disclosure. We will investigate all reports promptly and acknowledge
            valid findings. We do not pursue legal action against good-faith security researchers.
          </p>
          <div className="rounded-xl border p-4" style={{ background: CARD2, borderColor: BORDER }}>
            <p className="text-sm font-bold text-white mb-1">How to report a vulnerability:</p>
            <p className="text-sm" style={{ color: MUTED }}>
              Email <a href="mailto:adavi@adavi.ai" className="hover:underline" style={{ color: GOLD }}>adavi@adavi.ai</a> with
              subject line "Security Report" and a description of the issue. Please include steps to reproduce,
              potential impact, and any supporting materials. We will respond within 3 business days.
            </p>
          </div>
        </div>

        {/* Amber warning banner */}
        <div className="rounded-2xl border p-5 flex items-start gap-3"
          style={{ background: "rgba(197,163,90,0.06)", borderColor: GOLD_BORDER }}>
          <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" style={{ color: GOLD }} />
          <p className="text-sm" style={{ color: MUTED }}>
            Despite our best efforts, no system can guarantee perfect security. We encourage you to use a strong,
            unique password and to never share your login credentials with anyone.
          </p>
        </div>

        {/* Links */}
        <div className="grid sm:grid-cols-3 gap-4">
          {[
            { href: "/privacy", label: "Privacy Policy", desc: "What data we collect and how we use it" },
            { href: "/trust-center", label: "Trust Center", desc: "Full overview of our privacy & security commitments" },
            { href: "/contact", label: "Contact Us", desc: "Report an issue or ask a security question" },
          ].map(l => (
            <Link key={l.href} href={l.href}>
              <div className="rounded-xl border p-4 cursor-pointer h-full hover:border-amber-400/30 transition-colors"
                style={{ background: CARD, borderColor: BORDER }}>
                <p className="text-sm font-bold text-white mb-1">{l.label}</p>
                <p className="text-xs" style={{ color: DIM }}>{l.desc}</p>
              </div>
            </Link>
          ))}
        </div>
      </main>
    </AppLayout>
  );
}
