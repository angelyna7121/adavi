import { useState, useRef, useEffect } from "react";
import {
  X, BookOpen, TrendingUp, Home, Landmark, PiggyBank, BarChart3,
  DollarSign, ChevronRight, Search, Sparkles,
} from "lucide-react";
import { CARD, CARD2, GOLD, GOLD_BORDER, GOLD_BG, GOLD_BG2, BORDER, MUTED, DIM, BG } from "@/lib/design";

// ── Topic data ────────────────────────────────────────────────────────────────

interface Topic {
  id: string;
  icon: React.ElementType;
  label: string;
  short: string;           // one-liner shown in topic list
  content: TopicSection[];
}

interface TopicSection {
  heading: string;
  body: string;
  tip?: string;            // gold callout below body
}

const TOPICS: Topic[] = [
  {
    id: "net-worth",
    icon: BarChart3,
    label: "Net Worth",
    short: "What it means and why it matters",
    content: [
      {
        heading: "What is Net Worth?",
        body: "Net worth is the difference between everything you own (assets) and everything you owe (liabilities). It's the single most honest snapshot of your financial health at any given moment.\n\nFormula: Net Worth = Total Assets − Total Liabilities",
        tip: "Net worth can be negative — especially early in a career or right after buying a home. A negative net worth isn't a crisis; it's a starting point to improve from.",
      },
      {
        heading: "Why track it?",
        body: "Tracking net worth over time reveals whether your financial decisions are actually building wealth. Your income tells you how much comes in; your net worth tells you how much sticks.\n\nFor incorporated professionals, your corporate retained earnings are part of your personal net worth picture — the corporation is effectively a holding vehicle for your wealth.",
      },
      {
        heading: "How adavi.ai uses it",
        body: "The Net Worth Builder tracks your personal and corporate assets and liabilities separately, then combines them into a complete picture. You can import statements from bank and brokerage PDFs to auto-populate the items.",
      },
    ],
  },
  {
    id: "assets",
    icon: TrendingUp,
    label: "Assets",
    short: "Everything that adds to your wealth",
    content: [
      {
        heading: "What counts as an asset?",
        body: "An asset is anything of monetary value you own or control. Assets are grouped into two broad types:\n\n• Liquid assets — cash, chequing/savings accounts, GICs, money market funds. You can access these quickly.\n\n• Illiquid assets — real estate, business equity, vehicles, collectibles. These take time and cost to convert to cash.",
      },
      {
        heading: "Registered vs. Non-Registered",
        body: "In Canada, registered accounts (RRSP, TFSA, FHSA) shelter your investments from tax in different ways. When tracking net worth, the value you record for an RRSP should be the pre-withdrawal amount — remember there's a tax liability attached to it when you eventually withdraw.",
        tip: "A common mistake: recording RRSP balances at full face value without accounting for the future tax hit. Your actual after-tax RRSP value may be 20–40% lower depending on your retirement income.",
      },
      {
        heading: "Corporate assets",
        body: "If you operate through a CCPC, corporate assets (retained earnings, equipment, receivables) are technically owned by the corporation — but your shares in the corporation are your personal asset. Recording both separately avoids double-counting.",
      },
    ],
  },
  {
    id: "liabilities",
    icon: DollarSign,
    label: "Liabilities",
    short: "Debts and obligations you owe",
    content: [
      {
        heading: "What is a liability?",
        body: "A liability is any financial obligation you owe to someone else — now or in the future. Common liabilities include: mortgage balances, lines of credit, car loans, student loans, credit card balances, corporate loans, and deferred tax balances.",
      },
      {
        heading: "Good debt vs. bad debt",
        body: "\"Good\" debt is borrowed money used to acquire an asset that appreciates or generates income — like a mortgage on a rental property or a business loan for equipment that earns revenue. \"Bad\" debt is borrowed for consumption — credit cards, car loans on depreciating vehicles.\n\nFor incorporated professionals, a shareholder loan from your own corporation is a liability on your personal balance sheet (and an asset on the corp's).",
        tip: "Interest deductibility matters in Canada. Interest on money borrowed to earn income (rental, business, investment) is generally tax-deductible. Consumer debt interest is not.",
      },
    ],
  },
  {
    id: "mortgage-investment",
    icon: Home,
    label: "Mortgage (as Investment)",
    short: "When your home is part of your wealth",
    content: [
      {
        heading: "Primary residence as an asset",
        body: "Your home's current market value is an asset on your personal net worth statement. In Canada, gains on a principal residence are exempt from capital gains tax — making a paid-off home a uniquely tax-efficient store of wealth.",
      },
      {
        heading: "Rental and investment properties",
        body: "Investment properties are assets at fair market value, but they carry a deferred tax liability: when you sell, capital gains on the appreciation are taxable at 50% inclusion (or 2/3 for gains over $250K after the 2024 budget changes). Record both the asset value and the estimated deferred tax.",
        tip: "For a rental property worth $800K with a $200K ACB and a $300K mortgage: your asset is $800K, your liabilities include the $300K mortgage AND roughly $75K+ in deferred capital gains tax — so true equity is closer to $425K, not $500K.",
      },
      {
        heading: "Smith Manoeuvre",
        body: "The Smith Manoeuvre converts non-deductible mortgage interest into deductible investment loan interest by re-borrowing mortgage principal (via a HELOC) to invest in income-producing assets. It's a popular strategy for Canadian homeowners. Adavi.ai does not model this automatically, but your accountant can walk you through it.",
      },
    ],
  },
  {
    id: "mortgage-debt",
    icon: Home,
    label: "Mortgage (as Debt)",
    short: "How your mortgage affects your balance sheet",
    content: [
      {
        heading: "Recording your mortgage",
        body: "Your mortgage balance is the outstanding principal you owe to the lender — not the original purchase price or monthly payment. Find it on your mortgage statement or lender portal. Record the current balance as a liability.",
      },
      {
        heading: "Impact on net worth",
        body: "Early in a mortgage, most of your payment goes to interest. Your equity builds slowly. As you pay down principal — or as the property appreciates — the gap between asset value and mortgage balance widens, growing your net worth.",
        tip: "A $700K home with a $550K mortgage gives you $150K equity. If the home rises to $800K and you've paid it to $500K, you now have $300K equity — net worth doubled without extra cash outlay.",
      },
      {
        heading: "Refinancing and HELOCs",
        body: "When you refinance or draw on a HELOC, the loan amount increases your liabilities. Money borrowed for investment purposes creates a deductible liability; money borrowed for personal use does not. Keep these separate in your records.",
      },
    ],
  },
  {
    id: "tfsa",
    icon: PiggyBank,
    label: "TFSA",
    short: "Tax-Free Savings Account basics",
    content: [
      {
        heading: "What is a TFSA?",
        body: "A Tax-Free Savings Account lets Canadians (age 18+) invest and earn returns completely tax-free — including interest, dividends, and capital gains. Withdrawals are also tax-free, at any time and for any reason.",
      },
      {
        heading: "Contribution room",
        body: "Every year the government announces new TFSA contribution room (typically $6,000–$7,000). Room accumulates from the year you turned 18 (or 2009, whichever is later). Unused room carries forward indefinitely. As of 2024, the lifetime cumulative limit is $95,000.\n\nWithdrawals restore your contribution room — but only in the following calendar year.",
        tip: "For incorporated professionals: TFSAs can hold corporate-class mutual funds or ETFs, which can be tax-efficient. But since salary is required to generate TFSA room, high-dividend strategies may have you drawing salary just to maximize TFSA contributions.",
      },
      {
        heading: "TFSA on your net worth",
        body: "TFSA balances are recorded at full fair market value — unlike RRSPs, there is no future tax liability attached. A $95,000 TFSA is worth $95,000 net on your balance sheet.",
      },
    ],
  },
  {
    id: "rrsp",
    icon: Landmark,
    label: "RRSP",
    short: "Registered Retirement Savings Plan explained",
    content: [
      {
        heading: "What is an RRSP?",
        body: "An RRSP lets you defer tax on earned income. Contributions reduce your taxable income now; investments grow tax-sheltered inside; withdrawals in retirement are taxed as income (ideally at a lower rate than your working-years rate).",
      },
      {
        heading: "Contribution room",
        body: "Your RRSP room is 18% of your prior year's earned income (salary, net business income, rental income), minus any pension adjustment, up to a federal annual limit ($31,560 in 2024). Room accumulates if unused.\n\nFor incorporated professionals: only employment income counts toward RRSP room — dividends do not. This is a key trade-off in the salary vs. dividend decision.",
        tip: "If you pay yourself $100K salary, you earn $18,000 RRSP room. If you pay all dividends, you earn zero RRSP room. Some professionals draw enough salary just to maximize RRSP contributions.",
      },
      {
        heading: "RRSP on your net worth",
        body: "Record your RRSP at its current market value, but mentally note that future withdrawals will be taxed. A rough rule: discount the RRSP balance by your expected marginal retirement rate (often 20–30%) to get your true after-tax RRSP wealth.",
      },
      {
        heading: "RRSP vs. Corporate Retained Earnings",
        body: "For incorporated professionals, retained earnings inside a CCPC are also tax-deferred — often at lower corporate rates. The choice between contributing to RRSP vs. leaving money in the corporation depends on your expected retirement income, provincial rates, and investment strategy. This is where Adavi.ai's income strategy optimizer adds value.",
      },
    ],
  },
  {
    id: "income-strategy",
    icon: BookOpen,
    label: "Income Strategy",
    short: "Salary vs. dividends and why it matters",
    content: [
      {
        heading: "The core decision for incorporated professionals",
        body: "When you operate through a CCPC, you choose how to extract money: salary, dividends, or a blend. Each path has a different tax profile, CPP impact, and effect on retirement savings.",
      },
      {
        heading: "Salary",
        body: "Salary is a deductible expense for the corporation, reducing corporate tax. You pay personal income tax and CPP contributions on salary. Benefits:\n\n• Generates RRSP contribution room\n• Builds CPP pension (if that's a goal)\n• Simpler for mortgage qualification (T4 income is easy for lenders)\n\nDrawback: combined employee + employer CPP (up to ~11.9%) is a real cost.",
        tip: "The magic salary number for many Canadian professionals in 2025: ~$68,500 triggers maximum CPP contributions. Drawing more than this as salary vs. dividends requires careful comparison of marginal rates.",
      },
      {
        heading: "Dividends",
        body: "Dividends flow from after-tax corporate profits to your personal account. Benefits:\n\n• No CPP contributions (a cost saving or a retirement gap, depending on your view)\n• Dividend tax credit reduces personal tax on eligible dividends\n• Can be income-split with a spouse-shareholder in some structures\n\nDrawback: no RRSP room generated, no T4 income for mortgage qualification.",
      },
      {
        heading: "The optimal blend",
        body: "Most incorporated professionals benefit from a blend — enough salary to hit their RRSP contribution target and CPP goals, with the remainder taken as dividends. Adavi.ai's Income Strategy optimizer calculates the split that maximizes your after-tax cash for any given corporate profit level.",
      },
    ],
  },
];

// ── Search filter ─────────────────────────────────────────────────────────────

function filterTopics(topics: Topic[], q: string): Topic[] {
  if (!q.trim()) return topics;
  const lower = q.toLowerCase();
  return topics.filter(
    t =>
      t.label.toLowerCase().includes(lower) ||
      t.short.toLowerCase().includes(lower) ||
      t.content.some(
        s => s.heading.toLowerCase().includes(lower) || s.body.toLowerCase().includes(lower)
      )
  );
}

// ── Body renderer (newlines → paragraphs, bullets) ────────────────────────────

function BodyText({ text }: { text: string }) {
  const paras = text.split("\n\n");
  return (
    <div className="space-y-2">
      {paras.map((p, i) => {
        if (p.startsWith("•")) {
          const lines = p.split("\n").filter(Boolean);
          return (
            <ul key={i} className="space-y-1 pl-1">
              {lines.map((l, j) => (
                <li key={j} className="flex gap-2 text-sm leading-relaxed" style={{ color: MUTED }}>
                  <span className="shrink-0 mt-0.5" style={{ color: GOLD }}>•</span>
                  <span>{l.replace(/^•\s*/, "")}</span>
                </li>
              ))}
            </ul>
          );
        }
        if (p.startsWith("Formula:")) {
          return (
            <p key={i} className="text-sm font-mono px-3 py-2 rounded-lg"
              style={{ background: "rgba(197,163,90,0.08)", color: GOLD, border: `1px solid ${GOLD_BORDER}` }}>
              {p}
            </p>
          );
        }
        return (
          <p key={i} className="text-sm leading-relaxed" style={{ color: MUTED }}>{p}</p>
        );
      })}
    </div>
  );
}

// ── Topic detail view ─────────────────────────────────────────────────────────

function TopicDetail({ topic, onBack }: { topic: Topic; onBack: () => void }) {
  return (
    <div className="flex flex-col h-full">
      {/* Back row */}
      <button
        onClick={onBack}
        className="flex items-center gap-1.5 text-xs font-semibold mb-4 hover:opacity-80 transition-opacity"
        style={{ color: GOLD }}
        data-testid="button-help-back"
      >
        ← All topics
      </button>

      {/* Topic header */}
      <div className="flex items-center gap-3 mb-5">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: GOLD_BG2 }}>
          <topic.icon className="w-4 h-4" style={{ color: GOLD }} />
        </div>
        <div>
          <h3 className="font-bold text-white text-base leading-tight">{topic.label}</h3>
          <p className="text-xs" style={{ color: DIM }}>{topic.short}</p>
        </div>
      </div>

      {/* Sections */}
      <div className="flex-1 overflow-y-auto space-y-5 pr-1 scrollbar-thin">
        {topic.content.map((section, i) => (
          <div key={i}>
            <h4 className="text-sm font-bold text-white mb-2">{section.heading}</h4>
            <BodyText text={section.body} />
            {section.tip && (
              <div className="mt-3 rounded-xl px-4 py-3 text-xs leading-relaxed"
                style={{ background: GOLD_BG, border: `1px solid ${GOLD_BORDER}`, color: MUTED }}>
                <span className="font-bold" style={{ color: GOLD }}>💡 Note: </span>
                {section.tip}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Footer note */}
      <div className="pt-4 mt-4 border-t text-xs" style={{ borderColor: BORDER, color: DIM }}>
        Educational estimates only — not tax or financial advice.{" "}
        <a href="/disclaimer" className="hover:underline" style={{ color: GOLD }}>Disclaimer</a>
      </div>
    </div>
  );
}

// ── Main modal ────────────────────────────────────────────────────────────────

function HelpModal({ onClose }: { onClose: () => void }) {
  const [query, setQuery] = useState("");
  const [active, setActive] = useState<Topic | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const t = setTimeout(() => inputRef.current?.focus(), 80);
    return () => clearTimeout(t);
  }, []);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const visible = active ? [] : filterTopics(TOPICS, query);

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40"
        style={{ background: "rgba(0,0,0,0.55)", backdropFilter: "blur(3px)" }}
        onClick={onClose}
        data-testid="help-modal-backdrop"
      />

      {/* Panel */}
      <div
        className="fixed z-50 flex flex-col shadow-2xl"
        style={{
          bottom: "90px",
          right: "24px",
          width: "min(420px, calc(100vw - 32px))",
          height: "min(600px, calc(100vh - 120px))",
          background: CARD,
          border: `1px solid ${BORDER}`,
          borderRadius: "20px",
        }}
        data-testid="help-modal"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b shrink-0"
          style={{ borderColor: BORDER }}>
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center"
              style={{ background: GOLD_BG2 }}>
              <Sparkles className="w-3.5 h-3.5" style={{ color: GOLD }} />
            </div>
            <div>
              <p className="text-sm font-bold text-white leading-tight">Ask adavi.ai</p>
              <p className="text-xs" style={{ color: DIM }}>Educational financial guide</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-white/5 transition-colors"
            style={{ color: MUTED }}
            data-testid="button-help-close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-hidden px-5 py-4">
          {active ? (
            <TopicDetail topic={active} onBack={() => { setActive(null); setQuery(""); }} />
          ) : (
            <div className="flex flex-col h-full">
              {/* Search */}
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none"
                  style={{ color: DIM }} />
                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  placeholder="Search topics… TFSA, RRSP, net worth…"
                  className="w-full rounded-xl pl-8 pr-3 py-2.5 text-sm text-white placeholder:text-white/25 outline-none border transition-colors"
                  style={{
                    background: CARD2,
                    borderColor: query ? "rgba(197,163,90,0.35)" : BORDER,
                  }}
                  data-testid="input-help-search"
                />
              </div>

              {/* Topic list */}
              <div className="flex-1 overflow-y-auto space-y-1.5 pr-0.5 scrollbar-thin">
                {visible.length === 0 ? (
                  <div className="text-center pt-10">
                    <Search className="w-6 h-6 mx-auto mb-2" style={{ color: DIM }} />
                    <p className="text-sm" style={{ color: MUTED }}>No topics match "{query}"</p>
                    <button onClick={() => setQuery("")}
                      className="mt-2 text-xs hover:underline" style={{ color: GOLD }}>
                      Clear search
                    </button>
                  </div>
                ) : (
                  visible.map(topic => (
                    <button
                      key={topic.id}
                      onClick={() => setActive(topic)}
                      className="w-full text-left rounded-xl px-4 py-3 flex items-center gap-3 group transition-colors hover:border-amber-400/25"
                      style={{ background: CARD2, border: `1px solid ${BORDER}` }}
                      data-testid={`button-help-topic-${topic.id}`}
                    >
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors"
                        style={{ background: GOLD_BG }}>
                        <topic.icon className="w-3.5 h-3.5" style={{ color: GOLD }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-white">{topic.label}</p>
                        <p className="text-xs truncate" style={{ color: DIM }}>{topic.short}</p>
                      </div>
                      <ChevronRight className="w-3.5 h-3.5 shrink-0 opacity-30 group-hover:opacity-70 transition-opacity"
                        style={{ color: MUTED }} />
                    </button>
                  ))
                )}
              </div>

              {/* Bottom disclaimer */}
              <p className="text-xs pt-3 mt-2 border-t" style={{ borderColor: BORDER, color: DIM }}>
                Estimates only — not tax or financial advice.{" "}
                <a href="/disclaimer" className="hover:underline" style={{ color: GOLD }}>Disclaimer</a>
              </p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

// ── Floating button + widget ──────────────────────────────────────────────────

export function HelpWidget() {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Floating trigger button */}
      <button
        onClick={() => setOpen(o => !o)}
        className="fixed z-50 flex items-center gap-2 rounded-full shadow-lg transition-all hover:scale-105 active:scale-95"
        style={{
          bottom: "24px",
          right: "24px",
          padding: "10px 18px 10px 14px",
          background: open ? CARD2 : GOLD,
          border: open ? `1px solid ${BORDER}` : "none",
          color: open ? MUTED : BG,
        }}
        data-testid="button-help-widget"
        aria-label="Open help"
      >
        {open ? (
          <>
            <X className="w-4 h-4" />
            <span className="text-sm font-bold">Close</span>
          </>
        ) : (
          <>
            <Sparkles className="w-4 h-4" />
            <span className="text-sm font-bold">Ask adavi.ai</span>
          </>
        )}
      </button>

      {/* Modal */}
      {open && <HelpModal onClose={() => setOpen(false)} />}
    </>
  );
}

export default HelpWidget;
