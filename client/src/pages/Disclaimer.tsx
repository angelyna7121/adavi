import { AppLayout } from "@/components/layout/AppLayout";
import { AlertTriangle, Scale, UserX, Calculator, BookOpen, Shield, Mail } from "lucide-react";
import { Link } from "wouter";
import { useEffect } from "react";
import { CARD, GOLD, GOLD_BORDER, BORDER, MUTED, DIM, CARD2 } from "@/lib/design";

function Section({ title, icon: Icon, children }: {
  title: string; icon: React.ElementType; children: React.ReactNode;
}) {
  return (
    <section>
      <div className="flex items-center gap-3 mb-4">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
          style={{ background: "rgba(197,163,90,0.12)" }}>
          <Icon className="w-4 h-4" style={{ color: GOLD }} />
        </div>
        <h2 className="text-lg font-bold text-white">{title}</h2>
      </div>
      <div className="text-sm leading-relaxed space-y-3 pl-11" style={{ color: MUTED }}>
        {children}
      </div>
    </section>
  );
}

const limitations = [
  "Not filing-grade software — results cannot be used for CRA filings or assessments",
  "Does not model Alternative Minimum Tax (AMT) in full",
  "Does not model RDTOH, CDA, or GRIP continuity unless you enter those balances",
  "Does not assess salary reasonableness under ITA section 67",
  "Does not model family income-splitting, spousal RRSP, or attribution rules",
  "EI excluded by default — controlling shareholders are typically EI-exempt",
  "Provincial rates outside Ontario are not fully modelled",
  "Does not model lifetime CPP benefit value — only current contribution cost",
  "Does not account for all possible personal tax credits and deductions",
  "Results may not reflect very recent legislative changes or CRA interpretations",
];

export default function Disclaimer() {
  useEffect(() => { document.title = "Disclaimer | adavi.ai"; }, []);
  const today = new Date().toLocaleDateString("en-CA", { year: "numeric", month: "long", day: "numeric" });

  return (
    <AppLayout>
      <main className="flex-1 max-w-4xl mx-auto w-full px-4 py-14 space-y-10">

        {/* Header */}
        <section className="text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border text-xs font-semibold"
            style={{ background: "rgba(197,163,90,0.08)", borderColor: GOLD_BORDER, color: GOLD }}>
            <AlertTriangle className="w-3.5 h-3.5" />Important Notice
          </div>
          <h1 className="text-4xl font-bold text-white">Disclaimer</h1>
          <p className="text-sm" style={{ color: DIM }}>Last updated: {today}</p>
          <p className="text-sm max-w-xl mx-auto leading-relaxed" style={{ color: MUTED }}>
            Please read this disclaimer carefully. It explains the nature and limitations of all content and
            calculations provided by adavi.ai.
          </p>
        </section>

        {/* Primary warning banner */}
        <div className="rounded-2xl border p-6 flex items-start gap-4"
          style={{ background: "rgba(197,163,90,0.08)", borderColor: GOLD_BORDER }}>
          <AlertTriangle className="w-6 h-6 shrink-0 mt-0.5" style={{ color: GOLD }} />
          <div>
            <p className="font-bold text-white mb-1">Educational Estimates Only — Not Professional Advice</p>
            <p className="text-sm leading-relaxed" style={{ color: MUTED }}>
              All calculations, outputs, and content on adavi.ai are for general educational and informational
              purposes only. They do not constitute financial advice, tax advice, legal advice, accounting advice,
              or investment advice of any kind, and must not be relied upon for any financial or tax decision.
            </p>
          </div>
        </div>

        {/* Sections */}
        <div className="rounded-2xl border p-8 space-y-10" style={{ background: CARD, borderColor: BORDER }}>

          <Section title="Educational Purposes Only" icon={BookOpen}>
            <p>adavi.ai is an educational SaaS platform. Every calculation, estimate, output, or projection shown on this platform is intended solely to help users understand and explore concepts in Canadian personal and corporate taxation — not to replace professional advice.</p>
            <p>No output from adavi.ai should be treated as a professional opinion, recommendation, or guarantee. Results are illustrative only and will vary based on individual circumstances not captured in our models.</p>
          </Section>

          <div className="border-t" style={{ borderColor: BORDER }} />

          <Section title="No Professional Relationship" icon={UserX}>
            <p>Your use of adavi.ai does not create any of the following relationships:</p>
            <ul className="space-y-1.5 mt-2">
              {[
                "Accountant–client or CPA–client relationship",
                "Financial advisor–client relationship",
                "Lawyer–client or solicitor–client relationship",
                "Tax preparer–taxpayer relationship",
              ].map(item => (
                <li key={item} className="flex items-start gap-2">
                  <span className="shrink-0 mt-1" style={{ color: GOLD }}>·</span>{item}
                </li>
              ))}
            </ul>
            <p className="mt-2">adavi.ai is not a registered financial planner, tax professional, lawyer, accountant, or investment advisor. No information on this platform should substitute for consultation with a qualified professional who has reviewed your full financial and tax situation.</p>
          </Section>

          <div className="border-t" style={{ borderColor: BORDER }} />

          <Section title="Accuracy of Estimates" icon={Calculator}>
            <p>Our tax calculations are based on publicly available 2025–2026 Canadian federal and Ontario provincial tax rules and rates, including:</p>
            <ul className="space-y-1.5 mt-2">
              {[
                "Federal and Ontario personal income tax brackets",
                "CPP contribution rates and limits (base + CPP2)",
                "Ontario CCPC small business deduction (SBD) rates",
                "Simplified non-eligible dividend gross-up and dividend tax credit rates",
              ].map(item => (
                <li key={item} className="flex items-start gap-2">
                  <span className="shrink-0 mt-1" style={{ color: GOLD }}>·</span>{item}
                </li>
              ))}
            </ul>
            <p className="mt-2">These estimates are approximate and based on simplified models. They cannot account for every individual's full tax position, all available deductions and credits, or all CRA administrative positions.</p>
          </Section>

          <div className="border-t" style={{ borderColor: BORDER }} />

          <Section title="Known Limitations" icon={AlertTriangle}>
            <p>adavi.ai's models explicitly do not account for:</p>
            <div className="rounded-xl border p-4 mt-2" style={{ background: CARD2, borderColor: BORDER }}>
              <ul className="space-y-2">
                {limitations.map(l => (
                  <li key={l} className="flex items-start gap-2 text-sm" style={{ color: MUTED }}>
                    <span className="shrink-0 mt-1" style={{ color: GOLD }}>·</span>{l}
                  </li>
                ))}
              </ul>
            </div>
            <p className="mt-2">This list is not exhaustive. Always work with a qualified CPA who can assess your full situation.</p>
          </Section>

          <div className="border-t" style={{ borderColor: BORDER }} />

          <Section title="Seek Professional Advice" icon={Shield}>
            <div className="rounded-xl border p-4" style={{ background: "rgba(197,163,90,0.06)", borderColor: GOLD_BORDER }}>
              <p className="font-semibold text-white mb-2">Before making any of the following decisions, consult a qualified CPA or financial advisor:</p>
              <ul className="space-y-1.5">
                {[
                  "Setting your annual salary vs. dividend split",
                  "Deciding whether to declare eligible or non-eligible dividends",
                  "Planning RRSP or pension contributions",
                  "Making estate planning or corporate restructuring decisions",
                  "Filing your personal or corporate tax returns",
                ].map(item => (
                  <li key={item} className="flex items-start gap-2 text-sm" style={{ color: MUTED }}>
                    <span className="shrink-0 mt-1" style={{ color: GOLD }}>·</span>{item}
                  </li>
                ))}
              </ul>
            </div>
          </Section>

          <div className="border-t" style={{ borderColor: BORDER }} />

          <Section title="Limitation of Liability" icon={Scale}>
            <p>To the maximum extent permitted by applicable law, adavi.ai and its operators, officers, directors, employees, and affiliates shall not be liable for any loss, damage, tax liability, penalty, interest, or adverse outcome arising from:</p>
            <ul className="space-y-1.5 mt-2">
              {[
                "Reliance on any estimates, calculations, or content from adavi.ai",
                "Decisions made based on outputs of the Platform",
                "Errors or omissions in our tax models or assumptions",
                "Changes to tax law not yet reflected in our calculations",
              ].map(item => (
                <li key={item} className="flex items-start gap-2">
                  <span className="shrink-0 mt-1" style={{ color: GOLD }}>·</span>{item}
                </li>
              ))}
            </ul>
          </Section>

          <div className="border-t" style={{ borderColor: BORDER }} />

          <Section title="Contact" icon={Mail}>
            <p>Questions about this disclaimer or our methodology:</p>
            <div className="rounded-xl border p-4 mt-2 space-y-1" style={{ background: CARD2, borderColor: BORDER }}>
              <p><a href="mailto:adavi@adavi.ai" className="hover:underline" style={{ color: GOLD }}>adavi@adavi.ai</a></p>
              <p>44 Charles Street West, Toronto, Ontario, Canada</p>
            </div>
          </Section>
        </div>

        {/* Related links */}
        <div className="grid sm:grid-cols-3 gap-4">
          {[
            { href: "/about", label: "Methodology", desc: "See exactly how our tax calculations work" },
            { href: "/faq", label: "FAQ", desc: "Common questions about our accuracy and scope" },
            { href: "/contact", label: "Contact Us", desc: "Questions about specific calculations or limits" },
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
