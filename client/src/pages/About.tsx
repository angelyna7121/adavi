import { AppLayout } from "@/components/layout/AppLayout";
import { BookOpen, Calculator, Shield, Mail, Sparkles, ArrowRight } from "lucide-react";
import { useEffect } from "react";
import { BG, CARD, GOLD, GOLD_BORDER, BORDER, MUTED, DIM } from "@/lib/design";


function Section({ children, label, icon: Icon }: { children: React.ReactNode; label: string; icon: React.ElementType }) {
  return (
    <section className="space-y-4">
      <div className="flex items-center gap-3">
        <Icon className="w-5 h-5" style={{ color: GOLD }} />
        <h2 className="text-xl font-bold text-white">{label}</h2>
      </div>
      {children}
    </section>
  );
}

function NoteCard({ letter, title, body }: { letter: string; title: string; body: string }) {
  return (
    <div className="rounded-2xl border p-5 flex gap-4" style={{ background: CARD, borderColor: GOLD_BORDER }}>
      <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-black shrink-0 mt-0.5" style={{ background: "rgba(197,163,90,0.15)", color: GOLD }}>
        {letter}
      </div>
      <div>
        <p className="font-bold text-white mb-1">{title}</p>
        <p className="text-sm leading-relaxed" style={{ color: MUTED }}>{body}</p>
      </div>
    </div>
  );
}

function StepBlock({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-5">
      <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-black shrink-0 mt-1" style={{ background: "rgba(197,163,90,0.15)", color: GOLD }}>
        {n}
      </div>
      <div className="flex-1 space-y-3">
        <h3 className="font-bold text-lg text-white">{title}</h3>
        <div className="text-sm leading-relaxed space-y-3" style={{ color: MUTED }}>{children}</div>
      </div>
    </div>
  );
}

function Code({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl border px-5 py-3.5 font-mono text-sm leading-relaxed text-white whitespace-pre-line" style={{ background: "rgba(255,255,255,0.04)", borderColor: BORDER }}>
      {children}
    </div>
  );
}

export default function About() {
  useEffect(() => { document.title = "Methodology | How Adavi Works | adavi.ai"; }, []);

  return (
    <AppLayout>

      <main className="flex-1 max-w-3xl mx-auto w-full px-4 py-14 space-y-14">

        {/* Vision section */}
        <section className="rounded-2xl border p-8 text-center" style={{ background: "rgba(197,163,90,0.06)", borderColor: GOLD_BORDER }}>
          <div className="flex items-center justify-center gap-2 mb-4">
            <Sparkles className="w-5 h-5" style={{ color: GOLD }} />
            <span className="text-xs font-bold uppercase tracking-widest" style={{ color: GOLD }}>Our Vision</span>
          </div>
          <p className="text-lg leading-relaxed text-white max-w-2xl mx-auto">
            "adavi.ai is being built as an AI-powered financial planning platform that helps people understand, organize, and improve their financial lives through simple, intelligent, and accessible tools."
          </p>
          <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 gap-3 text-left">
            {["Tax Optimization", "Investment Analysis", "Cash Flow Planning", "Financial Health Score", "Accountant Collaboration", "Net Worth Tracking"].map(m => (
              <div key={m} className="flex items-center gap-2 text-sm" style={{ color: MUTED }}>
                <ArrowRight className="w-3.5 h-3.5 shrink-0" style={{ color: GOLD }} />
                {m}
              </div>
            ))}
          </div>
        </section>

        <section className="text-center space-y-4">
          <span className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full border text-sm font-semibold" style={{ background: "rgba(197,163,90,0.08)", borderColor: GOLD_BORDER, color: GOLD }}>
            <BookOpen className="w-4 h-4" />
            Methodology &amp; Disclaimers
          </span>
          <h1 className="text-4xl font-bold text-white">How Adavi Works</h1>
          <p className="text-lg leading-relaxed max-w-xl mx-auto" style={{ color: MUTED }}>
            Adavi models the full two-layer (corporate + personal) tax outcome for an Ontario owner-manager of a Canadian-Controlled Private Corporation, using 2026 estimated rates.
          </p>
        </section>

        <section className="space-y-4">
          <NoteCard letter="A" title="Estimates, not tax advice" body="All results are educational estimates. Adavi does not constitute financial, legal, or tax advice and does not replace advice from a qualified CPA. Filing decisions must be made with a professional." />
          <NoteCard letter="B" title="Most CCPC SBD income produces non-eligible dividends" body="Ontario CCPC owner-managers receiving small-business-rate income typically pay non-eligible dividends (15% gross-up, lower DTC). Eligible dividends (38% gross-up) require maintained GRIP or general-rate income. Adavi defaults to non-eligible." />
          <NoteCard letter="C" title="Corporate tax rates depend on more than just income" body="The small business deduction (SBD) can be reduced or eliminated by taxable capital over $10M, adjusted aggregate investment income, associated corporations, or a fiscal year spanning the Ontario rate change date." />
          <NoteCard letter="D" title="CPP contributions carry a future benefit" body="Paying salary increases total payroll cost through CPP contributions. However, CPP contributions create entitlement to future CPP retirement and disability benefits. Adavi does not model lifetime CPP value." />
        </section>

        <Section label="How Adavi Calculates Ontario 2026 Estimates" icon={Calculator}>
          <div className="space-y-8">
            <StepBlock n={1} title="Corporate taxable income">
              <p>Salary paid to the owner-manager is deducted from corporate net income. Employer CPP contributions also reduce corporate taxable income.</p>
              <Code>Corp taxable income = Revenue − Business expenses − Salary − Employer CPP</Code>
            </StepBlock>
            <StepBlock n={2} title="Corporate tax (Ontario CCPC, small business)">
              <p>Federal SBD rate is <strong className="text-white">9%</strong>. Ontario SBD rate is <strong className="text-white">3.2%</strong> for H1 2026 and <strong className="text-white">2.2%</strong> effective July 1, 2026.</p>
              <Code>Corp tax = (Fed SBD 9%) + (ON SBD 3.2%) × corp taxable income</Code>
            </StepBlock>
            <StepBlock n={3} title="Available dividend pool">
              <p>Dividends are paid entirely from after-tax corporate income. Adavi assumes all after-tax corporate income is distributed as dividends in the same year.</p>
              <Code>Dividends paid = Corp taxable income − Corp tax</Code>
            </StepBlock>
            <StepBlock n={4} title="Personal income tax — federal + Ontario progressive brackets">
              <p>Federal and Ontario taxes use progressive bracket tables. The Basic Personal Amount (BPA) credit reduces tax at the lowest bracket rate.</p>
              <div className="rounded-xl border overflow-hidden text-xs" style={{ borderColor: BORDER }}>
                <table className="w-full">
                  <thead>
                    <tr style={{ background: "rgba(255,255,255,0.04)" }}>
                      <th className="text-left px-4 py-2.5 text-white font-bold">Federal 2026 (est.)</th>
                      <th className="text-right px-4 py-2.5 text-white font-bold">Rate</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[["$0 – $57,375", "15%"], ["$57,375 – $114,750", "20.5%"], ["$114,750 – $177,882", "26%"], ["$177,882 – $253,414", "29%"], ["Over $253,414", "33%"]].map(([r, rate]) => (
                      <tr key={r} className="border-t" style={{ borderColor: BORDER }}>
                        <td className="px-4 py-2" style={{ color: MUTED }}>{r}</td>
                        <td className="px-4 py-2 text-right font-mono text-white">{rate}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </StepBlock>
            <StepBlock n={5} title="CPP and CPP2 (2026 estimated)">
              <p>CPP applies to salary between the basic exemption ($3,500) and YMPE (est. $73,200). Both employee and employer each contribute 5.95%.</p>
              <Code>Base CPP = (min(salary, $73,200) − $3,500) × 5.95% per side{"\n"}CPP2 = (min(salary, $83,900) − $73,200) × 4.0% per side</Code>
            </StepBlock>
          </div>
        </Section>

        <Section label="Remaining Limitations" icon={Shield}>
          <div className="rounded-2xl border p-6" style={{ background: CARD, borderColor: BORDER }}>
            <ul className="space-y-3 text-sm" style={{ color: MUTED }}>
              {[
                "Not filing-grade software — results cannot be used for actual CRA filings.",
                "Does not fully model Alternative Minimum Tax (AMT).",
                "Does not model RDTOH, CDA, or GRIP continuity unless you enter those balances.",
                "Does not determine salary reasonableness under ITA section 67.",
                "Does not model family income-splitting, spousal RRSP, or attribution rules.",
                "EI excluded by default — controlling shareholders are typically EI-exempt.",
              ].map(l => (
                <li key={l} className="flex items-start gap-2">
                  <span style={{ color: GOLD }} className="shrink-0 mt-0.5">·</span>
                  {l}
                </li>
              ))}
            </ul>
          </div>
        </Section>
      </main>

    </AppLayout>
  );
}
