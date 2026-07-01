import { AppLayout } from "@/components/layout/AppLayout";
import { Shield, Lock, Eye, Server, Check, Sparkles, ArrowRight, FileText, Scale, HelpCircle, Mail } from "lucide-react";
import { Link } from "wouter";
import { useEffect } from "react";
import { CARD, GOLD, GOLD_BORDER, BORDER, MUTED, DIM, CARD2 } from "@/lib/design";

const pillars = [
  {
    icon: Lock,
    title: "Data Privacy",
    desc: "Your financial data is yours. We never sell, share, or monetize your personal information. Your data is encrypted in transit and at rest, and you can request full deletion at any time.",
    link: "/privacy",
    linkLabel: "Privacy Policy",
  },
  {
    icon: Shield,
    title: "Application Security",
    desc: "We follow industry best practices for application security — HTTPS everywhere, server-side sessions, cryptographic password hashing, parameterized database queries, and strict API authorization.",
    link: "/security",
    linkLabel: "Security Details",
  },
  {
    icon: Eye,
    title: "Transparency",
    desc: "We are explicit about what adavi.ai can and cannot do. All outputs are clearly labelled as educational estimates. We publish our full methodology, calculation model, and known limitations.",
    link: "/about",
    linkLabel: "Our Methodology",
  },
  {
    icon: Scale,
    title: "Educational Integrity",
    desc: "adavi.ai never claims to provide tax or financial advice. We are clear about our limitations and actively encourage users to consult qualified CPAs before making financial decisions.",
    link: "/disclaimer",
    linkLabel: "Full Disclaimer",
  },
  {
    icon: Server,
    title: "Infrastructure Reliability",
    desc: "adavi.ai is hosted on resilient cloud infrastructure with automatic backups and high availability. Your saved data and reports are durable and accessible whenever you need them.",
    link: "/security",
    linkLabel: "Infrastructure Security",
  },
  {
    icon: FileText,
    title: "Clear Legal Terms",
    desc: "Our Terms of Service and Privacy Policy are written in plain language. We aim to be clear about your rights, our obligations, and what you can expect from us.",
    link: "/terms",
    linkLabel: "Terms of Service",
  },
];

const commitments = [
  "We never sell your personal data to third parties — ever.",
  "All data is encrypted using TLS 1.2+ in transit and encrypted at rest.",
  "You can request full deletion of your account and all associated data at any time.",
  "We do not use your financial inputs for advertising, profiling, or AI training.",
  "All calculations are clearly disclosed as educational estimates with known limitations.",
  "Payment information is handled entirely by Stripe — we never see your card number.",
  "We do not collect SIN numbers, banking credentials, or government-issued IDs.",
  "Our team reviews security practices and application code for vulnerabilities regularly.",
];

const legalLinks = [
  { href: "/terms", label: "Terms of Service", desc: "Your rights and responsibilities when using adavi.ai" },
  { href: "/privacy", label: "Privacy Policy", desc: "What we collect, why, and how you control it" },
  { href: "/disclaimer", label: "Disclaimer", desc: "Limitations of our educational estimates" },
  { href: "/security", label: "Security", desc: "Technical security practices and responsible disclosure" },
  { href: "/faq", label: "FAQ", desc: "Common questions about privacy, billing, and accuracy" },
  { href: "/contact", label: "Contact Us", desc: "Privacy questions, data requests, or security reports" },
];

export default function TrustCenter() {
  useEffect(() => { document.title = "Trust Center | adavi.ai"; }, []);

  return (
    <AppLayout>
      <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-14 space-y-14">

        {/* Vision / commitment banner */}
        <section className="rounded-2xl border p-8 text-center"
          style={{ background: "rgba(197,163,90,0.06)", borderColor: GOLD_BORDER }}>
          <div className="flex items-center justify-center gap-2 mb-4">
            <Sparkles className="w-5 h-5" style={{ color: GOLD }} />
            <span className="text-xs font-bold uppercase tracking-widest" style={{ color: GOLD }}>Our Commitment</span>
          </div>
          <p className="text-lg leading-relaxed text-white max-w-2xl mx-auto">
            "adavi.ai is being built as an AI-powered financial planning platform that helps people understand, organize,
            and improve their financial lives through simple, intelligent, and accessible tools."
          </p>
          <p className="text-sm mt-4 max-w-xl mx-auto" style={{ color: MUTED }}>
            We believe financial clarity shouldn't require a law degree. That's why we invest deeply in privacy,
            security, and honest communication about what our tools can and cannot do.
          </p>
        </section>

        {/* Header */}
        <section className="text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border text-xs font-semibold"
            style={{ background: "rgba(197,163,90,0.08)", borderColor: GOLD_BORDER, color: GOLD }}>
            <Shield className="w-3.5 h-3.5" />Trust Center
          </div>
          <h1 className="text-4xl font-bold text-white">Your Trust Is Our Foundation</h1>
          <p className="text-lg max-w-xl mx-auto" style={{ color: MUTED }}>
            We take your privacy, security, and financial data seriously.
            Here is a complete overview of how we protect you and your information.
          </p>
        </section>

        {/* Six pillars */}
        <section>
          <h2 className="text-xl font-bold text-white mb-5">Our Six Trust Pillars</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {pillars.map(p => (
              <Link key={p.title} href={p.link}>
                <div className="rounded-2xl border p-6 cursor-pointer h-full transition-colors hover:border-amber-400/30"
                  style={{ background: CARD, borderColor: BORDER }}>
                  <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-4"
                    style={{ background: "rgba(197,163,90,0.12)" }}>
                    <p.icon className="w-5 h-5" style={{ color: GOLD }} />
                  </div>
                  <h3 className="text-base font-bold text-white mb-2">{p.title}</h3>
                  <p className="text-sm leading-relaxed mb-4" style={{ color: MUTED }}>{p.desc}</p>
                  <div className="flex items-center gap-1 text-xs font-semibold" style={{ color: GOLD }}>
                    {p.linkLabel} <ArrowRight className="w-3.5 h-3.5" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* Commitments */}
        <section className="rounded-2xl border p-8" style={{ background: CARD, borderColor: BORDER }}>
          <h2 className="text-xl font-bold text-white mb-6">Our Commitments to You</h2>
          <div className="grid sm:grid-cols-2 gap-3">
            {commitments.map(c => (
              <div key={c} className="flex items-start gap-3 text-sm" style={{ color: MUTED }}>
                <Check className="w-4 h-4 shrink-0 mt-0.5" style={{ color: GOLD }} />
                {c}
              </div>
            ))}
          </div>
        </section>

        {/* What we are NOT */}
        <section className="rounded-2xl border p-8" style={{ background: CARD, borderColor: BORDER }}>
          <h2 className="text-xl font-bold text-white mb-2">What adavi.ai Is Not</h2>
          <p className="text-sm mb-5" style={{ color: MUTED }}>Transparency means being clear about our limitations, not just our strengths.</p>
          <div className="grid sm:grid-cols-2 gap-4">
            {[
              { label: "Not a tax advisor", desc: "adavi.ai is not a CPA, tax lawyer, or registered financial advisor. All outputs are educational estimates." },
              { label: "Not filing-grade software", desc: "Our calculations cannot be used directly for CRA filings or assessments. Always verify with a professional." },
              { label: "Not a bank", desc: "We never hold, transfer, or touch your money. Payments are processed entirely by Stripe." },
              { label: "Not a full provincial model", desc: "Our detailed tax model is currently Ontario-specific. Other provinces use illustrative rates only." },
            ].map(item => (
              <div key={item.label} className="rounded-xl border p-4"
                style={{ background: CARD2, borderColor: BORDER }}>
                <p className="text-sm font-bold text-white mb-1">{item.label}</p>
                <p className="text-xs leading-relaxed" style={{ color: DIM }}>{item.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Legal & policy links */}
        <section>
          <h2 className="text-xl font-bold text-white mb-5">Legal & Policy Documents</h2>
          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
            {legalLinks.map(l => (
              <Link key={l.href} href={l.href}>
                <div className="rounded-xl border p-4 cursor-pointer h-full hover:border-amber-400/30 transition-colors"
                  style={{ background: CARD, borderColor: BORDER }}>
                  <p className="text-sm font-bold text-white mb-1">{l.label}</p>
                  <p className="text-xs leading-relaxed" style={{ color: DIM }}>{l.desc}</p>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* Contact CTA */}
        <section className="rounded-2xl border p-8 text-center"
          style={{ background: "rgba(197,163,90,0.06)", borderColor: GOLD_BORDER }}>
          <HelpCircle className="w-8 h-8 mx-auto mb-3" style={{ color: GOLD }} />
          <h2 className="text-xl font-bold text-white mb-2">Questions or Concerns?</h2>
          <p className="text-sm mb-5 max-w-sm mx-auto" style={{ color: MUTED }}>
            Our team is here to help with any privacy, security, or data questions. We aim to respond within 2 business days.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <a href="mailto:adavi@adavi.ai"
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-opacity hover:opacity-80"
              style={{ background: GOLD, color: "#0D1929" }}>
              <Mail className="w-4 h-4" />adavi@adavi.ai
            </a>
            <Link href="/contact">
              <button className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold border transition-colors hover:border-amber-400/40"
                style={{ borderColor: GOLD_BORDER, color: GOLD }}>
                Open Contact Form
              </button>
            </Link>
          </div>
          <p className="text-xs mt-4" style={{ color: DIM }}>44 Charles Street West, Toronto, Ontario, Canada</p>
        </section>
      </main>
    </AppLayout>
  );
}
