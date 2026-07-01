import { AppLayout } from "@/components/layout/AppLayout";
import { Lock, Database, Eye, Trash2, Cookie, Shield, Mail, Globe, UserCheck } from "lucide-react";
import { Link } from "wouter";
import { useEffect } from "react";
import { CARD, GOLD, GOLD_BORDER, BORDER, MUTED, DIM, CARD2 } from "@/lib/design";

function Section({ n, title, icon: Icon, children }: {
  n: number; title: string; icon: React.ElementType; children: React.ReactNode;
}) {
  return (
    <section id={`p-${n}`} className="scroll-mt-20">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
          style={{ background: "rgba(197,163,90,0.12)" }}>
          <Icon className="w-4 h-4" style={{ color: GOLD }} />
        </div>
        <h2 className="text-lg font-bold text-white">{n}. {title}</h2>
      </div>
      <div className="text-sm leading-relaxed space-y-3 pl-11" style={{ color: MUTED }}>
        {children}
      </div>
    </section>
  );
}

const highlights = [
  { icon: Lock, label: "No data selling", desc: "We never sell, rent, or share your data with advertisers." },
  { icon: Eye, label: "No tracking cookies", desc: "We use only functional session cookies — no ad tracking." },
  { icon: Trash2, label: "Delete anytime", desc: "Request full account and data deletion at any time." },
  { icon: Shield, label: "Encrypted everywhere", desc: "TLS in transit, encrypted at rest, hashed passwords." },
];

export default function Privacy() {
  useEffect(() => { document.title = "Privacy Policy | adavi.ai"; }, []);
  const today = new Date().toLocaleDateString("en-CA", { year: "numeric", month: "long", day: "numeric" });

  return (
    <AppLayout>
      <main className="flex-1 max-w-4xl mx-auto w-full px-4 py-14 space-y-10">

        {/* Header */}
        <section className="text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border text-xs font-semibold"
            style={{ background: "rgba(197,163,90,0.08)", borderColor: GOLD_BORDER, color: GOLD }}>
            <Lock className="w-3.5 h-3.5" />Privacy
          </div>
          <h1 className="text-4xl font-bold text-white">Privacy Policy</h1>
          <p className="text-sm" style={{ color: DIM }}>Last updated: {today}</p>
          <p className="text-sm max-w-xl mx-auto leading-relaxed" style={{ color: MUTED }}>
            Your financial privacy matters deeply to us. This policy explains what we collect, why we collect it,
            and how we protect it.
          </p>
        </section>

        {/* Highlights */}
        <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-4">
          {highlights.map(h => (
            <div key={h.label} className="rounded-2xl border p-5 text-center space-y-2"
              style={{ background: CARD, borderColor: BORDER }}>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center mx-auto"
                style={{ background: "rgba(197,163,90,0.12)" }}>
                <h.icon className="w-5 h-5" style={{ color: GOLD }} />
              </div>
              <p className="text-sm font-bold text-white">{h.label}</p>
              <p className="text-xs leading-relaxed" style={{ color: DIM }}>{h.desc}</p>
            </div>
          ))}
        </div>

        {/* Sections */}
        <div className="rounded-2xl border p-8 space-y-10" style={{ background: CARD, borderColor: BORDER }}>

          <Section n={1} title="Information We Collect" icon={Database}>
            <p>We collect only what is necessary to operate the Platform. Here is a breakdown by category:</p>

            <div className="rounded-xl border overflow-hidden mt-2" style={{ borderColor: BORDER }}>
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ background: "rgba(255,255,255,0.04)" }}>
                    <th className="text-left px-4 py-3 text-white font-bold">Data Type</th>
                    <th className="text-left px-4 py-3 text-white font-bold">Purpose</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ["Email address", "Account authentication and communication"],
                    ["Password (hashed)", "Secure login — never stored in plain text"],
                    ["Province, business type, income range", "Personalise educational estimates during onboarding"],
                    ["Financial inputs (revenue, expenses, salary)", "Generate your requested educational tax estimates"],
                    ["Google OAuth profile (if used)", "Sign-in only — we do not access your Google data beyond email"],
                    ["Session data", "Keep you logged in securely between visits"],
                    ["Analytics events (anonymous)", "Understand feature usage to improve the Platform"],
                  ].map(([t, p]) => (
                    <tr key={t} className="border-t" style={{ borderColor: BORDER }}>
                      <td className="px-4 py-3 font-medium text-white/80">{t}</td>
                      <td className="px-4 py-3" style={{ color: MUTED }}>{p}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Section>

          <div className="border-t" style={{ borderColor: BORDER }} />

          <Section n={2} title="How We Use Your Information" icon={Eye}>
            <p>We use your information exclusively to:</p>
            <ul className="space-y-1.5 mt-2">
              {[
                "Authenticate your identity and secure your account",
                "Generate the educational financial estimates you request",
                "Save your scenarios and reports when you are signed in",
                "Communicate with you about account or subscription changes",
                "Improve the accuracy and usability of the Platform",
              ].map(item => (
                <li key={item} className="flex items-start gap-2">
                  <span className="shrink-0 mt-1" style={{ color: GOLD }}>·</span>{item}
                </li>
              ))}
            </ul>
            <p className="mt-2">We do not use your financial inputs for advertising, profiling, or any purpose beyond generating your requested estimates.</p>
          </Section>

          <div className="border-t" style={{ borderColor: BORDER }} />

          <Section n={3} title="Data We Do Not Collect" icon={Shield}>
            <div className="rounded-xl border p-4" style={{ background: "rgba(197,163,90,0.06)", borderColor: GOLD_BORDER }}>
              <p className="font-semibold text-white mb-3">We will never collect:</p>
              <ul className="space-y-2">
                {[
                  "Social Insurance Numbers (SIN) or government-issued ID numbers",
                  "Banking credentials, account numbers, or routing numbers",
                  "Credit card or debit card information (processed entirely by Stripe)",
                  "Investment portfolio holdings or brokerage account data",
                  "CRA My Account credentials or tax filing data",
                ].map(item => (
                  <li key={item} className="flex items-start gap-2 text-sm" style={{ color: MUTED }}>
                    <span className="shrink-0 mt-1" style={{ color: GOLD }}>·</span>{item}
                  </li>
                ))}
              </ul>
            </div>
          </Section>

          <div className="border-t" style={{ borderColor: BORDER }} />

          <Section n={4} title="Data Sharing" icon={Globe}>
            <p>We do not sell, rent, or share your personal information with third parties for marketing purposes. Period.</p>
            <p>We may share limited data only with the following trusted service providers, solely to operate the Platform:</p>
            <ul className="space-y-1.5 mt-2">
              {[
                { party: "Stripe", reason: "Payment processing for Pro subscriptions — they handle all card data" },
                { party: "Cloud hosting provider", reason: "Infrastructure for running the Platform and storing encrypted data" },
                { party: "Google OAuth", reason: "Sign-in authentication if you choose to use Google login" },
              ].map(({ party, reason }) => (
                <li key={party} className="flex items-start gap-2">
                  <span className="shrink-0 mt-1" style={{ color: GOLD }}>·</span>
                  <span><strong className="text-white">{party}</strong> — {reason}</span>
                </li>
              ))}
            </ul>
            <p className="mt-2">All service providers are bound by data processing agreements and may only process your data as instructed by us.</p>
          </Section>

          <div className="border-t" style={{ borderColor: BORDER }} />

          <Section n={5} title="Data Security" icon={Lock}>
            <p>We implement industry-standard technical and organizational measures to protect your data:</p>
            <ul className="space-y-1.5 mt-2">
              {[
                "All data is encrypted in transit using TLS 1.2+",
                "Passwords are hashed using Node.js crypto.scrypt with a unique random salt",
                "Sessions are stored server-side in PostgreSQL — session tokens are HTTP-only and SameSite-protected",
                "Access to production systems is restricted to authorized team members only",
              ].map(item => (
                <li key={item} className="flex items-start gap-2">
                  <span className="shrink-0 mt-1" style={{ color: GOLD }}>·</span>{item}
                </li>
              ))}
            </ul>
            <p className="mt-2">See our <Link href="/security" className="hover:underline" style={{ color: GOLD }}>Security page</Link> for a more detailed overview of our technical practices.</p>
          </Section>

          <div className="border-t" style={{ borderColor: BORDER }} />

          <Section n={6} title="Data Retention and Deletion" icon={Trash2}>
            <p>We retain your account data for as long as your account is active. Financial inputs and saved scenarios are retained until you delete them from within the app or delete your account.</p>
            <p>You may request deletion of your account and all associated data at any time by contacting us at <a href="mailto:adavi@adavi.ai" className="hover:underline" style={{ color: GOLD }}>adavi@adavi.ai</a>. We will process all deletion requests within 30 days.</p>
            <p>Analytics events are anonymized and retained for up to 12 months to help improve the Platform.</p>
          </Section>

          <div className="border-t" style={{ borderColor: BORDER }} />

          <Section n={7} title="Cookies and Sessions" icon={Cookie}>
            <p>adavi.ai uses a minimal, functional cookie approach:</p>
            <ul className="space-y-1.5 mt-2">
              {[
                "Session cookie — keeps you logged in between page visits (HTTP-only, SameSite=Strict)",
                "No advertising cookies or third-party tracking pixels",
                "No analytics cookies — we track usage events server-side with anonymized identifiers only",
              ].map(item => (
                <li key={item} className="flex items-start gap-2">
                  <span className="shrink-0 mt-1" style={{ color: GOLD }}>·</span>{item}
                </li>
              ))}
            </ul>
          </Section>

          <div className="border-t" style={{ borderColor: BORDER }} />

          <Section n={8} title="Your Rights (PIPEDA)" icon={UserCheck}>
            <p>Under Canada's Personal Information Protection and Electronic Documents Act (PIPEDA), you have the right to:</p>
            <ul className="space-y-1.5 mt-2">
              {[
                "Access a copy of personal information we hold about you",
                "Request correction of inaccurate personal information",
                "Withdraw consent for non-essential data processing",
                "Request deletion of your account and personal data",
                "Lodge a complaint with the Office of the Privacy Commissioner of Canada",
              ].map(item => (
                <li key={item} className="flex items-start gap-2">
                  <span className="shrink-0 mt-1" style={{ color: GOLD }}>·</span>{item}
                </li>
              ))}
            </ul>
            <p className="mt-2">To exercise any of these rights, contact us at <a href="mailto:adavi@adavi.ai" className="hover:underline" style={{ color: GOLD }}>adavi@adavi.ai</a>.</p>
          </Section>

          <div className="border-t" style={{ borderColor: BORDER }} />

          <Section n={9} title="Contact" icon={Mail}>
            <p>For privacy questions, concerns, or requests:</p>
            <div className="rounded-xl border p-4 mt-2 space-y-1" style={{ background: CARD2, borderColor: BORDER }}>
              <p><a href="mailto:adavi@adavi.ai" className="hover:underline" style={{ color: GOLD }}>adavi@adavi.ai</a></p>
              <p>44 Charles Street West, Toronto, Ontario, Canada</p>
              <p className="text-xs pt-1" style={{ color: DIM }}>We respond to all privacy requests within 5 business days.</p>
            </div>
          </Section>
        </div>

        {/* Related links */}
        <div className="grid sm:grid-cols-3 gap-4">
          {[
            { href: "/security", label: "Security", desc: "Our technical security practices in detail" },
            { href: "/trust-center", label: "Trust Center", desc: "Full overview of our privacy commitment" },
            { href: "/terms", label: "Terms of Service", desc: "Your rights and responsibilities on adavi.ai" },
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
