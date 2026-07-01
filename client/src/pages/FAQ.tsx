import { AppLayout } from "@/components/layout/AppLayout";
import { HelpCircle, ChevronDown, ChevronUp, Calculator, Shield, CreditCard, User, BookOpen } from "lucide-react";
import { Link } from "wouter";
import { useState, useEffect } from "react";
import { CARD, GOLD, GOLD_BORDER, BORDER, MUTED, DIM, CARD2 } from "@/lib/design";

const categories = [
  {
    icon: BookOpen,
    label: "About adavi.ai",
    faqs: [
      {
        q: "What is adavi.ai?",
        a: "adavi.ai is an educational financial planning platform for Canadian incorporated professionals. It helps CCPC owner-managers explore and visualize salary vs. dividend compensation strategies, track net worth, and understand the tax implications of their decisions — all through a clear, interactive interface.",
      },
      {
        q: "Who is adavi.ai built for?",
        a: "adavi.ai is built primarily for Canadian incorporated professionals — CCPC owner-managers, consultants, contractors, doctors, lawyers, and other incorporated business owners who want to understand how to optimize their compensation between salary and dividends. It's also useful for anyone who wants a clear view of their net worth.",
      },
      {
        q: "Is adavi.ai real financial advice?",
        a: "No. adavi.ai provides educational estimates only. Our tools are designed to help you understand and explore your financial options — not to replace a qualified CPA or financial advisor. All results should be treated as starting points for a conversation with your accountant, not as filing-grade advice. See our full Disclaimer for details.",
      },
    ],
  },
  {
    icon: Calculator,
    label: "Calculations & Accuracy",
    faqs: [
      {
        q: "How accurate are the tax estimates?",
        a: "Our calculations are based on publicly available 2025–2026 Canadian federal and Ontario provincial tax rules, including income tax brackets, CPP rates, and CCPC SBD rates. They are simplified models that cannot account for your full tax position, all deductions, or all CRA administrative positions. Results should be treated as educational starting points, not filing-grade numbers.",
      },
      {
        q: "What provinces are supported?",
        a: "Our income strategy calculations currently model Ontario 2025/2026 tax rates (federal + Ontario personal tax, Ontario CCPC SBD). You can select other provinces in your profile, but the detailed tax model uses Ontario rates. Full multi-province modelling is on our roadmap.",
      },
      {
        q: "What is GRIP?",
        a: "GRIP stands for General Rate Income Pool. It tracks your corporation's eligibility to pay eligible dividends — which carry a higher dividend tax credit than non-eligible dividends. If you have GRIP, eligible dividends may result in a lower personal tax burden. If you don't know your GRIP balance, adavi.ai defaults to non-eligible dividends — the typical scenario for CCPC small-business income. Your accountant can confirm your GRIP balance from your T2 Schedule 53.",
      },
      {
        q: "Why doesn't adavi.ai include EI?",
        a: "Business owners who control more than 40% of a corporation's voting shares are generally exempt from Employment Insurance (EI) premiums under the Employment Insurance Act. Since most adavi.ai users are controlling owner-managers of their CCPC, EI is excluded by default.",
      },
      {
        q: "Why does adavi.ai focus on Ontario?",
        a: "We started with Ontario because it's home to the largest concentration of Canadian incorporated professionals. Ontario also has a relatively straightforward CCPC tax structure (SBD at combined ~12.2%). We plan to add full multi-province support — including BC, Alberta, and Quebec — in a future update.",
      },
    ],
  },
  {
    icon: Shield,
    label: "Privacy & Security",
    faqs: [
      {
        q: "Is my financial data private?",
        a: "Yes. We never sell, share, or monetize your financial information. Your data is encrypted in transit using TLS and at rest. You can request deletion of all your data at any time by contacting us at adavi@adavi.ai. See our Privacy Policy for full details.",
      },
      {
        q: "Do you collect my SIN or banking information?",
        a: "No. We never collect Social Insurance Numbers, banking credentials, account numbers, credit card numbers, or any government-issued identification. Payment information is handled entirely by Stripe — we never see your card number.",
      },
      {
        q: "How is my password stored?",
        a: "Passwords are hashed using Node.js crypto.scrypt — a memory-hard key derivation function — with a unique random salt per user. Your plaintext password is never stored, logged, or transmitted. See our Security page for more details.",
      },
    ],
  },
  {
    icon: CreditCard,
    label: "Plans & Billing",
    faqs: [
      {
        q: "What is the Pro plan?",
        a: "Pro ($8.99/month or $89/year) unlocks the ability to save unlimited scenarios as permanent reports, download professional PDFs to share with your accountant, and access your full report history. All calculations are free and unlimited for everyone — including anonymous visitors. No Pro plan is required to use the calculator.",
      },
      {
        q: "Can I try adavi.ai without signing up?",
        a: "Yes. The income strategy calculator is fully available to anonymous visitors with no account required. You can explore all calculations freely. Creating a free account lets you save your work, and upgrading to Pro unlocks PDF exports and saved reports.",
      },
      {
        q: "How do I cancel my subscription?",
        a: "You can manage or cancel your subscription at any time from the Billing page in your account. Cancellation takes effect at the end of your current billing period — you keep Pro access until that date. No partial-period refunds are offered.",
      },
      {
        q: "Can I delete my account?",
        a: "Yes. Contact us at adavi@adavi.ai and we will delete your account and all associated data within 30 days of your request.",
      },
    ],
  },
  {
    icon: User,
    label: "Account & Support",
    faqs: [
      {
        q: "How do I reset my password?",
        a: "On the Login page, click 'Forgot password' to receive a reset link by email. If you signed up via Google, you don't have a password — use Google sign-in instead. For further help, contact adavi@adavi.ai.",
      },
      {
        q: "Can I use adavi.ai on my phone?",
        a: "Yes. adavi.ai is fully responsive and works on modern mobile browsers. The income strategy wizard and net worth builder are both optimized for smaller screens.",
      },
    ],
  },
];

function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border rounded-xl overflow-hidden transition-colors"
      style={{ borderColor: open ? GOLD_BORDER : BORDER }}>
      <button
        className="w-full flex items-center justify-between px-5 py-4 text-left gap-4"
        style={{ background: open ? "rgba(197,163,90,0.06)" : "transparent" }}
        onClick={() => setOpen(!open)}
      >
        <span className="font-semibold text-sm text-white leading-snug">{q}</span>
        {open
          ? <ChevronUp className="w-4 h-4 shrink-0" style={{ color: GOLD }} />
          : <ChevronDown className="w-4 h-4 shrink-0" style={{ color: DIM }} />}
      </button>
      {open && (
        <div className="px-5 pb-5 text-sm leading-relaxed" style={{ color: MUTED, borderTop: `1px solid ${BORDER}` }}>
          <p className="pt-4">{a}</p>
        </div>
      )}
    </div>
  );
}

export default function FAQ() {
  useEffect(() => { document.title = "FAQ | adavi.ai"; }, []);

  return (
    <AppLayout>
      <main className="flex-1 max-w-4xl mx-auto w-full px-4 py-14 space-y-14">

        {/* Header */}
        <section className="text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border text-xs font-semibold"
            style={{ background: "rgba(197,163,90,0.08)", borderColor: GOLD_BORDER, color: GOLD }}>
            <HelpCircle className="w-3.5 h-3.5" />FAQ
          </div>
          <h1 className="text-4xl font-bold text-white">Frequently Asked Questions</h1>
          <p className="text-lg max-w-xl mx-auto" style={{ color: MUTED }}>
            Everything you need to know about adavi.ai — calculations, privacy, billing, and more.
          </p>
        </section>

        {/* Category sections */}
        {categories.map(cat => (
          <section key={cat.label} className="space-y-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ background: "rgba(197,163,90,0.12)" }}>
                <cat.icon className="w-4 h-4" style={{ color: GOLD }} />
              </div>
              <h2 className="text-lg font-bold text-white">{cat.label}</h2>
            </div>
            <div className="space-y-3">
              {cat.faqs.map(f => <FAQItem key={f.q} q={f.q} a={f.a} />)}
            </div>
          </section>
        ))}

        {/* Still have questions CTA */}
        <div className="rounded-2xl border p-8 text-center" style={{ background: "rgba(197,163,90,0.06)", borderColor: GOLD_BORDER }}>
          <HelpCircle className="w-8 h-8 mx-auto mb-3" style={{ color: GOLD }} />
          <h2 className="text-xl font-bold text-white mb-2">Still have a question?</h2>
          <p className="text-sm mb-5" style={{ color: MUTED }}>
            We're happy to help with anything not covered here — calculations, methodology, billing, or privacy.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <a href="mailto:adavi@adavi.ai"
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-opacity hover:opacity-80"
              style={{ background: GOLD, color: "#0D1929" }}>
              Email us at adavi@adavi.ai
            </a>
            <Link href="/contact">
              <button className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold border transition-colors hover:border-amber-400/40"
                style={{ borderColor: GOLD_BORDER, color: GOLD }}>
                Open Contact Form
              </button>
            </Link>
          </div>
        </div>

        {/* Related links */}
        <div className="grid sm:grid-cols-3 gap-4">
          {[
            { href: "/about", label: "Methodology", desc: "Detailed explanation of our tax calculation model" },
            { href: "/disclaimer", label: "Disclaimer", desc: "Limitations of our educational estimates" },
            { href: "/pricing", label: "Pricing", desc: "Free vs. Pro — what's included in each plan" },
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
