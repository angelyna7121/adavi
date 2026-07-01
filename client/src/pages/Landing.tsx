import { AppLayout } from "@/components/layout/AppLayout";
import { useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { BG, CARD, GOLD, GOLD_BORDER, BORDER, MUTED, DIM } from "@/lib/design";
import {
  ArrowRight, Upload, TrendingUp, PieChart, Sparkles,
  Home, DollarSign, BarChart3, ChevronRight
} from "lucide-react";


const features = [
  {
    icon: Home,
    title: "Create Your Net Worth",
    desc: "Upload your financial documents and instantly organize everything you own and owe into a clear, professional net worth statement.",
    href: "/net-worth",
    cta: "Build Net Worth",
  },
  {
    icon: DollarSign,
    title: "Optimize Your Income",
    desc: "Discover the ideal salary and dividend split for your corporation. Model different scenarios and see the tax impact in real time.",
    href: "/income-strategy",
    cta: "Explore Strategy",
  },
  {
    icon: BarChart3,
    title: "Grow with Confidence",
    desc: "Track your financial progress as adavi.ai expands with Tax Optimization, Investment Analysis, Cash Flow Planning, Financial Health Score, and Accountant Collaboration.",
    href: "/about",
    cta: "See the Roadmap",
  },
];

const steps = [
  { n: "01", title: "Upload your documents", body: "Bank statements, investment statements, mortgage statements — any PDF, image, CSV, or spreadsheet." },
  { n: "02", title: "We organize everything", body: "adavi.ai reads your documents and sorts them into assets and liabilities automatically." },
  { n: "03", title: "Review and refine", body: "Check what we found, correct anything that doesn't look right, and confirm your net worth." },
  { n: "04", title: "Download your report", body: "Get a professional net worth statement and income strategy summary ready to share with your accountant." },
];

export default function Landing() {
  const [showSignupGate, setShowSignupGate] = useState(false);

  return (
    <AppLayout>

      {/* Sign-up gate */}
      {showSignupGate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4" style={{ background: "rgba(0,0,0,0.8)" }}>
          <div className="rounded-2xl border p-8 w-full max-w-sm text-center" style={{ background: CARD, borderColor: GOLD_BORDER }}>
            <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: "rgba(197,163,90,0.15)" }}>
              <Upload className="w-6 h-6" style={{ color: GOLD }} />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Create a Free Account to Upload</h3>
            <p className="text-sm mb-6" style={{ color: MUTED }}>Sign up to upload your documents and build your net worth statement.</p>
            <Link href="/signup">
              <Button className="w-full font-bold mb-3 h-11" style={{ background: GOLD, color: BG }} data-testid="button-signup-gate-landing">
                Create Free Account <ArrowRight className="w-4 h-4 ml-1.5" />
              </Button>
            </Link>
            <Link href="/login">
              <Button variant="outline" className="w-full mb-3 border text-white hover:bg-white/5" style={{ borderColor: BORDER }}>
                Log In
              </Button>
            </Link>
            <button onClick={() => setShowSignupGate(false)} className="text-sm" style={{ color: DIM }}>Maybe later</button>
          </div>
        </div>
      )}

      {/* Hero */}
      <section className="flex-1 flex flex-col items-center justify-center text-center px-4 pt-20 pb-16">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border mb-8 text-xs font-semibold" style={{ background: "rgba(197,163,90,0.08)", borderColor: GOLD_BORDER, color: GOLD }}>
          <Sparkles className="w-3.5 h-3.5" />
          AI-Powered Financial Planning Platform
        </div>

        <h1 className="text-3xl sm:text-5xl md:text-6xl font-bold text-white leading-tight mb-6 max-w-3xl">
          Know Your Net Worth.{" "}
          <span style={{ color: GOLD }}>Build Your Financial Future.</span>
        </h1>

        <p className="text-base sm:text-xl max-w-2xl mx-auto mb-10 leading-relaxed" style={{ color: MUTED }}>
          Upload your financial documents, organize what you own and owe, and get clear financial insights in minutes.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 mb-16">
          <Link href="/signup">
            <Button className="h-13 px-8 text-base font-bold shadow-lg" style={{ background: GOLD, color: BG }} data-testid="button-start-free-hero">
              Start Free <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </Link>
          <a href="#how-it-works">
            <Button variant="outline" className="h-13 px-8 text-base border text-white hover:bg-white/5" style={{ borderColor: BORDER }}>
              See How It Works
            </Button>
          </a>
        </div>

        {/* Positioned for */}
        <p className="text-sm mb-3" style={{ color: DIM }}>Built for</p>
        <div className="flex flex-wrap justify-center gap-2 text-xs font-medium">
          {["Individuals", "Families", "Entrepreneurs", "Incorporated Business Owners"].map(t => (
            <span key={t} className="px-3 py-1.5 rounded-full border" style={{ borderColor: GOLD_BORDER, color: MUTED, background: "rgba(197,163,90,0.05)" }}>
              {t}
            </span>
          ))}
        </div>
      </section>

      {/* 3 Feature cards */}
      <section className="px-4 pb-20 max-w-5xl mx-auto w-full">
        <div className="grid md:grid-cols-3 gap-5">
          {features.map((f, i) => (
            <Link key={f.title} href={f.href}>
              <div
                className="rounded-2xl border p-7 h-full cursor-pointer transition-all hover:border-gold group"
                style={{ background: CARD, borderColor: i === 2 ? GOLD_BORDER : BORDER }}
              >
                <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-5" style={{ background: i === 2 ? "rgba(197,163,90,0.15)" : "rgba(255,255,255,0.06)" }}>
                  <f.icon className="w-6 h-6" style={{ color: GOLD }} />
                </div>
                <h3 className="text-lg font-bold text-white mb-3">{f.title}</h3>
                <p className="text-sm leading-relaxed mb-5" style={{ color: MUTED }}>{f.desc}</p>
                <div className="flex items-center gap-1.5 text-xs font-bold" style={{ color: GOLD }}>
                  {f.cta} <ChevronRight className="w-3.5 h-3.5" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="px-4 py-20 max-w-4xl mx-auto w-full">
        <div className="text-center mb-14">
          <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: GOLD }}>How It Works</p>
          <h2 className="text-3xl font-bold text-white">From documents to insights in minutes</h2>
        </div>
        <div className="grid md:grid-cols-2 gap-6">
          {steps.map(s => (
            <div key={s.n} className="flex gap-5 p-6 rounded-2xl border" style={{ background: CARD, borderColor: BORDER }}>
              <span className="text-2xl font-bold shrink-0" style={{ color: GOLD, opacity: 0.4 }}>{s.n}</span>
              <div>
                <p className="font-bold text-white mb-1.5">{s.title}</p>
                <p className="text-sm leading-relaxed" style={{ color: MUTED }}>{s.body}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Platform positioning */}
      <section className="px-4 py-16 max-w-3xl mx-auto w-full text-center">
        <div className="rounded-2xl border p-10" style={{ background: "rgba(197,163,90,0.05)", borderColor: GOLD_BORDER }}>
          <Sparkles className="w-8 h-8 mx-auto mb-4" style={{ color: GOLD }} />
          <h2 className="text-2xl font-bold text-white mb-4">adavi.ai is an AI-powered financial planning platform</h2>
          <p className="text-base leading-relaxed mb-6" style={{ color: MUTED }}>
            For individuals, families, entrepreneurs, and incorporated business owners who want to understand, organize, and improve their financial lives through simple, intelligent, and accessible tools.
          </p>
          <p className="text-sm mb-8" style={{ color: DIM }}>
            Coming soon: Tax Optimization · Investment Analysis · Cash Flow Planning · Financial Health Score · Accountant Collaboration
          </p>
          <Link href="/signup">
            <Button className="font-bold px-8 h-12" style={{ background: GOLD, color: BG }} data-testid="button-start-free-bottom">
              Start Free — No Credit Card Required
            </Button>
          </Link>
        </div>
      </section>

    </AppLayout>
  );
}
