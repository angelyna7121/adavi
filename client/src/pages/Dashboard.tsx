import { AppLayout } from "@/components/layout/AppLayout";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { PieChart, TrendingUp, FileText, ArrowRight, Crown, Lock, Plus, ChevronRight } from "lucide-react";
import { BG, CARD, CARD2, GOLD, GOLD_BORDER, BORDER, MUTED, DIM } from "@/lib/design";


function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function formatDate() {
  return new Date().toLocaleDateString("en-CA", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
}

export default function Dashboard() {
  const { user } = useAuth();
  const isPro = user?.subscriptionStatus === "active" || user?.subscriptionStatus === "trialing";
  const firstName = user?.email?.split("@")[0] ?? "there";
  const displayName = firstName.charAt(0).toUpperCase() + firstName.slice(1);

  const { data: reports = [] } = useQuery<any[]>({ queryKey: ["/api/reports"] });
  const { data: netWorthList = [] } = useQuery<any[]>({ queryKey: ["/api/net-worth"] });
  const { data: strategies = [] } = useQuery<any[]>({ queryKey: ["/api/income-strategy"] });

  const modules = [
    {
      icon: PieChart,
      title: "Create Net Worth Statement",
      desc: "Upload your statements and see a full breakdown of your assets and liabilities.",
      href: "/net-worth",
      count: netWorthList.length,
      countLabel: "statements",
      color: "#4ADE80",
    },
    {
      icon: TrendingUp,
      title: "Create Income Strategy",
      desc: "Get a personalized salary vs. dividend recommendation for your corporation.",
      href: "/income-strategy",
      count: strategies.length,
      countLabel: "analyses",
      color: "#60A5FA",
    },
    {
      icon: FileText,
      title: "View My Reports",
      desc: "Access all your saved net worth and income strategy reports.",
      href: "/reports",
      count: reports.length,
      countLabel: "reports",
      color: GOLD,
    },
  ];

  return (
    <AppLayout>
      <div className="container mx-auto px-4 py-10 max-w-5xl">

        {/* Welcome header */}
        <div className="mb-10">
          <p className="text-sm mb-1" style={{ color: MUTED }}>{formatDate()}</p>
          <h1 className="text-3xl font-bold text-white">{getGreeting()}, {displayName}. 👋</h1>
          <p className="mt-1.5 text-base" style={{ color: MUTED }}>What would you like to work on today?</p>
        </div>

        {/* Quick stats */}
        <div className="grid grid-cols-3 gap-2 sm:gap-4 mb-8">
          {[
            { label: "Net Worth Statements", value: netWorthList.length, color: "#4ADE80" },
            { label: "Income Strategies", value: strategies.length, color: "#60A5FA" },
            { label: "Saved Reports", value: reports.length, color: GOLD },
          ].map(s => (
            <div key={s.label} className="rounded-xl border p-3 sm:p-4" style={{ background: CARD, borderColor: BORDER }}>
              <p className="text-xl sm:text-2xl font-bold mb-0.5" style={{ color: s.color }}>{s.value}</p>
              <p className="text-xs leading-tight" style={{ color: DIM }}>{s.label}</p>
            </div>
          ))}
        </div>

        {/* Module cards */}
        <div className="grid md:grid-cols-3 gap-5 mb-8">
          {modules.map(m => (
            <Link key={m.title} href={m.href}>
              <div
                className="rounded-2xl border p-6 flex flex-col gap-4 cursor-pointer transition-all hover:border-gold group"
                style={{ background: CARD, borderColor: BORDER }}
                data-testid={`card-module-${m.title.toLowerCase().replace(/\s+/g, "-")}`}
              >
                <div className="flex items-start justify-between">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: "rgba(255,255,255,0.05)" }}>
                    <m.icon className="w-6 h-6" style={{ color: m.color }} />
                  </div>
                  {m.count > 0 && (
                    <span className="text-xs px-2 py-0.5 rounded-full font-semibold" style={{ background: "rgba(255,255,255,0.06)", color: MUTED }}>
                      {m.count} {m.countLabel}
                    </span>
                  )}
                </div>
                <div className="flex-1">
                  <h3 className="text-base font-bold text-white mb-2">{m.title}</h3>
                  <p className="text-sm leading-relaxed" style={{ color: MUTED }}>{m.desc}</p>
                </div>
                <div className="flex items-center text-sm font-semibold" style={{ color: GOLD }}>
                  Open <ArrowRight className="w-4 h-4 ml-1.5" />
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* Recent activity */}
        {reports.length > 0 && (
          <div className="rounded-2xl border p-6 mb-8" style={{ background: CARD, borderColor: BORDER }}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-white">Recent Reports</h2>
              <Link href="/reports">
                <span className="text-xs font-semibold hover:text-white" style={{ color: GOLD }}>View all <ChevronRight className="w-3 h-3 inline" /></span>
              </Link>
            </div>
            <div className="space-y-2">
              {reports.slice(0, 3).map((r: any) => (
                <div key={r.id} className="flex items-center justify-between rounded-xl px-4 py-3" style={{ background: CARD2 }}>
                  <div className="flex items-center gap-3">
                    <FileText className="w-4 h-4" style={{ color: GOLD }} />
                    <div>
                      <p className="text-sm font-medium text-white">{r.title}</p>
                      <p className="text-xs" style={{ color: DIM }}>{new Date(r.createdAt).toLocaleDateString("en-CA")}</p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4" style={{ color: DIM }} />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Billing / plan card */}
        <div className="rounded-2xl border p-6" style={{ background: isPro ? "rgba(197,163,90,0.08)" : CARD, borderColor: isPro ? GOLD_BORDER : BORDER }}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: isPro ? "rgba(197,163,90,0.2)" : "rgba(255,255,255,0.05)" }}>
                {isPro ? <Crown className="w-5 h-5" style={{ color: GOLD }} /> : <Lock className="w-5 h-5" style={{ color: MUTED }} />}
              </div>
              <div>
                <p className="font-bold text-white">{isPro ? "Premium Plan" : "Free Plan"}</p>
                <p className="text-sm" style={{ color: MUTED }}>
                  {isPro ? "You have full access to all features." : "Upgrade to save reports and download PDFs."}
                </p>
              </div>
            </div>
            {!isPro && (
              <Link href="/pricing">
                <Button className="font-bold whitespace-nowrap" style={{ background: GOLD, color: BG }} data-testid="button-upgrade-dashboard">
                  <Crown className="w-4 h-4 mr-1.5" />
                  Upgrade to Premium
                </Button>
              </Link>
            )}
            {isPro && (
              <Link href="/billing">
                <Button variant="outline" className="text-white/70 hover:text-white border" style={{ borderColor: GOLD_BORDER }} data-testid="button-manage-billing">
                  Manage Billing
                </Button>
              </Link>
            )}
          </div>
        </div>

        <p className="text-center text-xs mt-8" style={{ color: DIM }}>
          Educational estimates only. Not tax, legal, accounting, or investment advice.
        </p>
      </div>
    </AppLayout>
  );
}
