import { AppLayout } from "@/components/layout/AppLayout";
import { FileText, Scale, ShieldCheck, UserCheck, Globe, AlertTriangle, Mail, RefreshCw, Ban } from "lucide-react";
import { Link } from "wouter";
import { useEffect } from "react";
import { CARD, GOLD, GOLD_BORDER, BORDER, MUTED, DIM, CARD2 } from "@/lib/design";

const TOC = [
  "Acceptance of Terms",
  "Description of Service",
  "Not Financial or Tax Advice",
  "User Accounts",
  "Acceptable Use",
  "Intellectual Property",
  "Limitation of Liability",
  "Privacy",
  "Paid Subscriptions",
  "Cancellation & Refunds",
  "Modifications to Service",
  "Governing Law",
  "Contact",
];

function Section({ n, title, icon: Icon, children }: {
  n: number; title: string; icon: React.ElementType; children: React.ReactNode;
}) {
  return (
    <section id={`section-${n}`} className="scroll-mt-20">
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

export default function Terms() {
  useEffect(() => { document.title = "Terms of Service | adavi.ai"; }, []);
  const today = new Date().toLocaleDateString("en-CA", { year: "numeric", month: "long", day: "numeric" });

  return (
    <AppLayout>
      <main className="flex-1 max-w-4xl mx-auto w-full px-4 py-14 space-y-10">

        {/* Header */}
        <section className="text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border text-xs font-semibold"
            style={{ background: "rgba(197,163,90,0.08)", borderColor: GOLD_BORDER, color: GOLD }}>
            <FileText className="w-3.5 h-3.5" />Legal
          </div>
          <h1 className="text-4xl font-bold text-white">Terms of Service</h1>
          <p className="text-sm" style={{ color: DIM }}>Last updated: {today} · Effective immediately upon use</p>
          <p className="text-sm max-w-xl mx-auto leading-relaxed" style={{ color: MUTED }}>
            Please read these Terms of Service carefully before using adavi.ai. By accessing or using our platform,
            you agree to be bound by these terms.
          </p>
        </section>

        {/* Quick-nav notice */}
        <div className="rounded-2xl border p-6" style={{ background: "rgba(197,163,90,0.06)", borderColor: GOLD_BORDER }}>
          <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: GOLD }}>Table of Contents</p>
          <ol className="grid sm:grid-cols-2 gap-1.5 text-sm list-decimal list-inside" style={{ color: MUTED }}>
            {TOC.map((t, i) => (
              <li key={t}>
                <a href={`#section-${i + 1}`} className="hover:underline" style={{ color: MUTED }}>{t}</a>
              </li>
            ))}
          </ol>
        </div>

        {/* Sections */}
        <div className="rounded-2xl border p-8 space-y-10" style={{ background: CARD, borderColor: BORDER }}>

          <Section n={1} title="Acceptance of Terms" icon={Scale}>
            <p>By accessing or using adavi.ai (the "Platform"), you acknowledge that you have read, understood, and agree to be bound by these Terms of Service ("Terms") and our Privacy Policy.</p>
            <p>If you do not agree to these Terms, you must not access or use adavi.ai. Your continued use of the Platform after any changes to these Terms constitutes acceptance of those changes.</p>
            <p>These Terms apply to all visitors, registered users, and paying subscribers of adavi.ai.</p>
          </Section>

          <div className="border-t" style={{ borderColor: BORDER }} />

          <Section n={2} title="Description of Service" icon={Globe}>
            <p>adavi.ai provides educational financial planning tools for Canadian individuals and incorporated business owners ("Users"). Our current tools include:</p>
            <ul className="space-y-1.5 mt-2">
              {[
                "Net worth tracking and financial statement builder",
                "Salary vs. dividend income strategy analysis for CCPC owner-managers",
                "Downloadable PDF financial reports for accountant review",
                "Ontario 2025/2026 estimated corporate and personal tax calculations",
              ].map(item => (
                <li key={item} className="flex items-start gap-2">
                  <span className="shrink-0 mt-1" style={{ color: GOLD }}>·</span>{item}
                </li>
              ))}
            </ul>
            <p className="mt-2">All results are educational estimates only. The Platform is not filing-grade tax software and cannot be used for CRA submissions.</p>
          </Section>

          <div className="border-t" style={{ borderColor: BORDER }} />

          <Section n={3} title="Not Financial or Tax Advice" icon={AlertTriangle}>
            <div className="rounded-xl border px-4 py-3.5 font-semibold text-white"
              style={{ background: "rgba(197,163,90,0.08)", borderColor: GOLD_BORDER }}>
              adavi.ai does not provide financial, tax, legal, accounting, or investment advice of any kind.
            </div>
            <p className="mt-3">All calculations are educational estimates based on publicly available Canadian tax rules and simplified assumptions. Outputs do not constitute professional advice and must not be relied upon for:</p>
            <ul className="space-y-1.5 mt-2">
              {[
                "CRA tax filings or assessments",
                "Compensation structure decisions",
                "Investment or estate planning decisions",
                "Legal or accounting engagements",
              ].map(item => (
                <li key={item} className="flex items-start gap-2">
                  <span className="shrink-0 mt-1" style={{ color: GOLD }}>·</span>{item}
                </li>
              ))}
            </ul>
            <p className="mt-2">Always consult a qualified CPA, tax lawyer, or licensed financial advisor who understands your complete financial situation before making any decisions. See our full <Link href="/disclaimer" className="hover:underline" style={{ color: GOLD }}>Disclaimer</Link> for additional limitations.</p>
          </Section>

          <div className="border-t" style={{ borderColor: BORDER }} />

          <Section n={4} title="User Accounts" icon={UserCheck}>
            <p>To access certain features, you must create an account. When creating an account, you agree to:</p>
            <ul className="space-y-1.5 mt-2">
              {[
                "Provide accurate, current, and complete information",
                "Maintain the security and confidentiality of your login credentials",
                "Notify us promptly of any unauthorized access to your account",
                "Accept responsibility for all activity that occurs under your account",
              ].map(item => (
                <li key={item} className="flex items-start gap-2">
                  <span className="shrink-0 mt-1" style={{ color: GOLD }}>·</span>{item}
                </li>
              ))}
            </ul>
            <p className="mt-2">You must be at least 18 years of age and legally eligible to enter into contracts in your jurisdiction to create an account. We reserve the right to suspend or terminate accounts that violate these Terms.</p>
          </Section>

          <div className="border-t" style={{ borderColor: BORDER }} />

          <Section n={5} title="Acceptable Use" icon={Ban}>
            <p>You agree not to use adavi.ai to:</p>
            <ul className="space-y-1.5 mt-2">
              {[
                "Violate any applicable Canadian or international laws or regulations",
                "Attempt to gain unauthorized access to our systems, databases, or infrastructure",
                "Reverse-engineer, decompile, or extract our proprietary calculation logic",
                "Scrape, harvest, or systematically collect data from the Platform",
                "Transmit malware, spam, or any harmful code",
                "Impersonate any person, organization, or entity",
                "Use the Platform in any manner that could harm, disable, or impair the service",
              ].map(item => (
                <li key={item} className="flex items-start gap-2">
                  <span className="shrink-0 mt-1" style={{ color: GOLD }}>·</span>{item}
                </li>
              ))}
            </ul>
          </Section>

          <div className="border-t" style={{ borderColor: BORDER }} />

          <Section n={6} title="Intellectual Property" icon={ShieldCheck}>
            <p>All content, features, software, calculation methodologies, design elements, and branding of adavi.ai are owned by adavi.ai and its licensors and are protected by Canadian and international copyright, trademark, and other intellectual property laws.</p>
            <p>You are granted a limited, non-exclusive, non-transferable, revocable licence to access and use the Platform for personal, non-commercial educational purposes, subject to these Terms.</p>
            <p>You may not reproduce, distribute, modify, create derivative works from, publicly display, or commercially exploit any portion of the Platform without our express prior written consent.</p>
          </Section>

          <div className="border-t" style={{ borderColor: BORDER }} />

          <Section n={7} title="Limitation of Liability" icon={Scale}>
            <p>To the fullest extent permitted by applicable law, adavi.ai, its officers, directors, employees, and affiliates shall not be liable for:</p>
            <ul className="space-y-1.5 mt-2">
              {[
                "Any indirect, incidental, special, consequential, or punitive damages",
                "Loss of profits, data, goodwill, or other intangible losses",
                "Damages arising from reliance on any educational estimates or calculations",
                "Service interruptions, errors, or omissions",
                "Unauthorized access to or alteration of your transmissions or data",
              ].map(item => (
                <li key={item} className="flex items-start gap-2">
                  <span className="shrink-0 mt-1" style={{ color: GOLD }}>·</span>{item}
                </li>
              ))}
            </ul>
            <p className="mt-2">Our total liability to you for any claim arising from these Terms shall not exceed the amount you paid to adavi.ai in the 12 months preceding the claim, or $50 CAD, whichever is greater.</p>
          </Section>

          <div className="border-t" style={{ borderColor: BORDER }} />

          <Section n={8} title="Privacy" icon={ShieldCheck}>
            <p>Your use of adavi.ai is governed by our <Link href="/privacy" className="hover:underline" style={{ color: GOLD }}>Privacy Policy</Link>, which is incorporated into these Terms by reference. By using the Platform, you consent to our data practices as described in the Privacy Policy.</p>
            <p>For a broader overview of our privacy and security commitments, please visit our <Link href="/trust-center" className="hover:underline" style={{ color: GOLD }}>Trust Center</Link>.</p>
          </Section>

          <div className="border-t" style={{ borderColor: BORDER }} />

          <Section n={9} title="Paid Subscriptions" icon={UserCheck}>
            <p>adavi.ai offers the following paid subscription plan:</p>
            <div className="rounded-xl border p-4 mt-3" style={{ background: CARD2, borderColor: GOLD_BORDER }}>
              <p className="font-bold text-white mb-1">Pro Plan</p>
              <p>$8.99/month or $89/year — Unlimited report saves, PDF exports, AI explanations, tax update alerts.</p>
            </div>
            <p className="mt-3">All calculations and unlimited use of the income strategy wizard and net worth builder are available free to all users, including anonymous visitors. Paid plans unlock saving, exporting, and Pro features.</p>
            <p>Subscription fees are processed by Stripe. By subscribing, you agree to Stripe's terms and authorize recurring charges to your payment method.</p>
          </Section>

          <div className="border-t" style={{ borderColor: BORDER }} />

          <Section n={10} title="Cancellation & Refunds" icon={RefreshCw}>
            <p>You may cancel your subscription at any time from your Billing page. Cancellation takes effect at the end of your current billing period. You will retain Pro access until that date.</p>
            <p>adavi.ai does not offer refunds for partially used subscription periods. If you believe you were charged in error, contact us within 7 days at <a href="mailto:adavi@adavi.ai" className="hover:underline" style={{ color: GOLD }}>adavi@adavi.ai</a>.</p>
          </Section>

          <div className="border-t" style={{ borderColor: BORDER }} />

          <Section n={11} title="Modifications to Service" icon={RefreshCw}>
            <p>We reserve the right to modify, suspend, or discontinue any part of adavi.ai at any time, with or without notice. We may also update these Terms at any time.</p>
            <p>Material changes to these Terms will be communicated via email to registered users where possible. Continued use of the Platform after changes are posted constitutes acceptance of the revised Terms.</p>
          </Section>

          <div className="border-t" style={{ borderColor: BORDER }} />

          <Section n={12} title="Governing Law" icon={Scale}>
            <p>These Terms are governed by and construed in accordance with the laws of the Province of Ontario and the federal laws of Canada applicable therein, without regard to conflict of law principles.</p>
            <p>Any dispute arising from these Terms or your use of adavi.ai shall be subject to the exclusive jurisdiction of the courts of Ontario, Canada.</p>
          </Section>

          <div className="border-t" style={{ borderColor: BORDER }} />

          <Section n={13} title="Contact" icon={Mail}>
            <p>For questions about these Terms of Service, please contact us:</p>
            <div className="rounded-xl border p-4 mt-2 space-y-1" style={{ background: CARD2, borderColor: BORDER }}>
              <p><a href="mailto:adavi@adavi.ai" className="hover:underline" style={{ color: GOLD }}>adavi@adavi.ai</a></p>
              <p>44 Charles Street West, Toronto, Ontario, Canada</p>
            </div>
          </Section>
        </div>

        {/* Related links */}
        <div className="grid sm:grid-cols-3 gap-4">
          {[
            { href: "/privacy", label: "Privacy Policy", desc: "How we collect and protect your data" },
            { href: "/disclaimer", label: "Disclaimer", desc: "Limitations of our educational estimates" },
            { href: "/trust-center", label: "Trust Center", desc: "Our full privacy & security commitment" },
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
