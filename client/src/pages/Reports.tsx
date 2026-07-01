import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import {
  FileText, TrendingUp, BarChart3, Download, Eye, Trash2,
  Lock, Crown, Plus, CalendarDays, Hash, Inbox, Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { AppLayout } from "@/components/layout/AppLayout";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { NetWorthUpgradeModal } from "@/components/NetWorthUpgradeModal";
import type { Report } from "@shared/schema";
import {
  BG, CARD, CARD2, GOLD, GOLD_BORDER, GOLD_BG, GOLD_BG2,
  MUTED, DIM, BORDER, GREEN,
} from "@/lib/design";

// ── helpers ───────────────────────────────────────────────────────────────────

function fmt(d: string | Date) {
  return new Date(d).toLocaleDateString("en-CA", {
    year: "numeric", month: "short", day: "numeric",
  });
}

function rptId(id: number) {
  return `RPT-${String(id).padStart(5, "0")}`;
}

// ── Section header ────────────────────────────────────────────────────────────

function SectionHeader({
  icon, label, count, href, ctaLabel,
}: {
  icon: React.ReactNode; label: string; count: number; href: string; ctaLabel: string;
}) {
  return (
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-2.5">
        <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
          style={{ background: GOLD_BG2 }}>
          {icon}
        </div>
        <h2 className="text-base font-bold text-white">{label}</h2>
        {count > 0 && (
          <span className="text-xs px-2 py-0.5 rounded-full font-bold"
            style={{ background: GOLD_BG, color: GOLD }}>
            {count}
          </span>
        )}
      </div>
      <Link href={href}>
        <Button size="sm" variant="ghost"
          className="gap-1.5 text-xs font-semibold hover:bg-white/5"
          style={{ color: GOLD }}>
          <Plus className="w-3.5 h-3.5" />{ctaLabel}
        </Button>
      </Link>
    </div>
  );
}

// ── Report card ───────────────────────────────────────────────────────────────

function ReportCard({
  report, isPro, onDelete, onUpgrade,
}: {
  report: Report; isPro: boolean; onDelete: (id: number) => void; onUpgrade: () => void;
}) {
  const { toast } = useToast();

  return (
    <div
      className="rounded-2xl border p-5 flex flex-col gap-4 relative overflow-hidden"
      style={{ background: CARD, borderColor: BORDER }}
      data-testid={`card-report-${report.id}`}
    >
      {/* top shimmer line */}
      <div className="absolute top-0 left-0 right-0 h-px"
        style={{ background: `linear-gradient(90deg, transparent, ${GOLD}50, transparent)` }} />

      {/* Meta */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-white leading-snug truncate"
            data-testid={`text-report-title-${report.id}`}>
            {report.title}
          </p>
          <div className="flex items-center gap-3 mt-1.5 flex-wrap">
            <span className="flex items-center gap-1 text-xs" style={{ color: DIM }}>
              <CalendarDays className="w-3 h-3" />{fmt(report.createdAt)}
            </span>
            <span className="flex items-center gap-1 text-xs font-mono" style={{ color: DIM }}>
              <Hash className="w-3 h-3" />{rptId(report.id)}
            </span>
            <span className="text-xs px-2 py-0.5 rounded-full font-semibold"
              style={{
                background: "rgba(74,222,128,0.1)",
                color: GREEN,
              }}>
              {report.status}
            </span>
          </div>
        </div>

        {/* Delete */}
        <button
          onClick={() => onDelete(report.id)}
          className="p-1.5 rounded-lg transition-colors hover:bg-red-500/10 shrink-0"
          style={{ color: "rgba(248,113,113,0.4)" }}
          title="Delete report"
          data-testid={`button-delete-report-${report.id}`}
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <Link href={`/reports/preview/${report.id}`} className="flex-1">
          <Button
            size="sm"
            className="w-full gap-1.5 font-semibold"
            style={{ background: GOLD_BG2, color: GOLD, border: `1px solid ${GOLD_BORDER}` }}
            data-testid={`button-view-report-${report.id}`}
          >
            <Eye className="w-3.5 h-3.5" />View
          </Button>
        </Link>

        <Button
          size="sm"
          variant="ghost"
          className="gap-1.5 font-semibold hover:bg-white/5"
          style={{ color: isPro ? MUTED : "rgba(197,163,90,0.4)" }}
          onClick={() => {
            if (!isPro) { onUpgrade(); return; }
            window.open(`/reports/preview/${report.id}`, "_blank");
          }}
          title={isPro ? "Download PDF" : "Upgrade to download PDF"}
          data-testid={`button-download-report-${report.id}`}
        >
          {isPro
            ? <><Download className="w-3.5 h-3.5" /><span className="text-xs">PDF</span></>
            : <><Lock className="w-3.5 h-3.5" /><span className="text-xs">PDF</span></>}
        </Button>
      </div>
    </div>
  );
}

// ── Empty state (per section) ─────────────────────────────────────────────────

function EmptySection({ href, cta }: { href: string; cta: string }) {
  return (
    <div className="rounded-2xl border border-dashed p-8 flex flex-col items-center gap-3 text-center"
      style={{ borderColor: BORDER }}>
      <Inbox className="w-8 h-8" style={{ color: DIM }} />
      <div>
        <p className="text-sm font-semibold text-white">No reports saved yet</p>
        <p className="text-xs mt-0.5" style={{ color: DIM }}>
          Complete an analysis and save it to see reports here.
        </p>
      </div>
      <Link href={href}>
        <Button size="sm" className="gap-1.5 font-semibold mt-1"
          style={{ background: GOLD_BG2, color: GOLD, border: `1px solid ${GOLD_BORDER}` }}>
          <Plus className="w-3.5 h-3.5" />{cta}
        </Button>
      </Link>
    </div>
  );
}

// ── Pro gate (free users) ─────────────────────────────────────────────────────

function ProGate() {
  return (
    <div className="rounded-2xl border p-10 flex flex-col items-center gap-6 text-center"
      style={{ background: CARD, borderColor: GOLD_BORDER, boxShadow: "0 0 60px rgba(197,163,90,0.06)" }}
      data-testid="gate-reports-premium">

      <div className="relative">
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center"
          style={{ background: GOLD_BG2, boxShadow: "0 0 32px rgba(197,163,90,0.18)" }}>
          <FileText className="w-7 h-7" style={{ color: GOLD }} />
        </div>
        <div className="absolute -top-1.5 -right-1.5 w-6 h-6 rounded-full flex items-center justify-center"
          style={{ background: BG, border: `1.5px solid ${GOLD_BORDER}` }}>
          <Lock className="w-3 h-3" style={{ color: GOLD }} />
        </div>
      </div>

      <div>
        <h2 className="text-xl font-bold text-white mb-1">Reports — Pro Feature</h2>
        <p className="text-sm max-w-sm mx-auto" style={{ color: MUTED }}>
          Upgrade to save your analyses as permanent reports you can revisit, share, and export to PDF for your accountant.
        </p>
      </div>

      {/* Feature bullets */}
      <div className="grid sm:grid-cols-3 gap-3 w-full max-w-md text-left">
        {[
          "Save unlimited reports",
          "Download professional PDFs",
          "Access all previous reports",
        ].map(f => (
          <div key={f} className="flex items-start gap-2 rounded-xl border p-3 text-xs"
            style={{ background: GOLD_BG, borderColor: "rgba(197,163,90,0.2)", color: MUTED }}>
            <Check className="w-3.5 h-3.5 shrink-0 mt-0.5" style={{ color: GOLD }} />
            {f}
          </div>
        ))}
      </div>

      {/* Preview skeleton cards */}
      <div className="w-full grid sm:grid-cols-2 gap-3 max-w-md">
        {[
          { icon: <BarChart3 className="w-4 h-4" style={{ color: GOLD }} />, label: "Net Worth Summary", date: "Jun 28, 2026", id: "RPT-00001" },
          { icon: <TrendingUp className="w-4 h-4" style={{ color: GOLD }} />, label: "Income Strategy", date: "Jun 29, 2026", id: "RPT-00002" },
        ].map(r => (
          <div key={r.id} className="rounded-xl border p-4 text-left relative overflow-hidden"
            style={{ background: CARD2, borderColor: BORDER }}>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-6 h-6 rounded-md flex items-center justify-center"
                style={{ background: GOLD_BG }}>{r.icon}</div>
              <p className="text-xs font-semibold text-white truncate">{r.label}</p>
            </div>
            <p className="text-xs" style={{ color: DIM }}>{r.date}</p>
            <p className="text-xs font-mono mb-3" style={{ color: DIM }}>{r.id}</p>
            <div className="flex gap-1.5">
              <div className="h-6 flex-1 rounded-lg flex items-center justify-center gap-1"
                style={{ background: GOLD_BG, color: GOLD }}>
                <Eye className="w-3 h-3" />
                <span className="text-xs font-semibold">View</span>
              </div>
              <div className="h-6 w-10 rounded-lg flex items-center justify-center"
                style={{ background: "rgba(255,255,255,0.04)" }}>
                <Lock className="w-3 h-3" style={{ color: GOLD }} />
              </div>
            </div>
            {/* blur overlay */}
            <div className="absolute inset-0 rounded-xl pointer-events-none"
              style={{ backdropFilter: "blur(2px)", background: "rgba(13,25,41,0.4)" }} />
          </div>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <Link href="/billing">
          <Button className="gap-2 font-bold px-6" style={{ background: GOLD, color: BG }}
            data-testid="button-upgrade-reports">
            <Crown className="w-4 h-4" />Upgrade to Pro — $8.99/mo
          </Button>
        </Link>
        <Link href="/pricing">
          <Button variant="ghost" className="hover:bg-white/5 font-semibold" style={{ color: MUTED }}>
            See all features
          </Button>
        </Link>
      </div>

      <p className="text-xs" style={{ color: DIM }}>Or save with annual billing — $89/yr (save 17%)</p>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function Reports() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { toast } = useToast();
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  const isPro = user?.subscriptionStatus === "active" || user?.subscriptionStatus === "trialing";

  const { data: reports = [], isLoading } = useQuery<Report[]>({
    queryKey: ["/api/reports"],
  });

  const deleteReport = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/reports/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/reports"] });
      toast({ title: "Report deleted" });
    },
    onError: () => toast({ title: "Could not delete report", variant: "destructive" }),
  });

  const netWorthReports    = reports.filter(r => r.reportType === "net_worth");
  const incomeStratReports = reports.filter(r => r.reportType === "income_strategy");

  return (
    <AppLayout>
      <NetWorthUpgradeModal open={showUpgradeModal} onClose={() => setShowUpgradeModal(false)} />
      <div className="container mx-auto px-4 py-10 max-w-3xl">

        {/* Page header */}
        <div className="mb-8">
          <div className="flex items-center gap-2.5 mb-1">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center"
              style={{ background: GOLD_BG2 }}>
              <FileText className="w-4 h-4" style={{ color: GOLD }} />
            </div>
            <h1 className="text-2xl font-bold text-white">Reports</h1>
          </div>
          <p className="text-sm" style={{ color: MUTED }}>
            Saved analyses you can revisit and share with your accountant.
          </p>
        </div>

        {/* Loading */}
        {isLoading && (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="rounded-2xl border h-28 animate-pulse"
                style={{ background: CARD, borderColor: BORDER }} />
            ))}
          </div>
        )}

        {/* Free gate */}
        {!isLoading && !isPro && <ProGate />}

        {/* Pro: two sections */}
        {!isLoading && isPro && (
          <div className="space-y-10">

            {/* ── Net Worth Summary ── */}
            <section>
              <SectionHeader
                icon={<BarChart3 className="w-3.5 h-3.5" style={{ color: GOLD }} />}
                label="Net Worth Summary"
                count={netWorthReports.length}
                href="/net-worth"
                ctaLabel="New analysis"
              />
              {netWorthReports.length === 0
                ? <EmptySection href="/net-worth" cta="Open Net Worth Builder" />
                : (
                  <div className="grid sm:grid-cols-2 gap-4">
                    {netWorthReports.map(r => (
                      <ReportCard key={r.id} report={r} isPro={isPro}
                        onDelete={id => deleteReport.mutate(id)}
                        onUpgrade={() => setShowUpgradeModal(true)} />
                    ))}
                  </div>
                )}
            </section>

            {/* ── Income Strategy Summary ── */}
            <section>
              <SectionHeader
                icon={<TrendingUp className="w-3.5 h-3.5" style={{ color: GOLD }} />}
                label="Income Strategy Summary"
                count={incomeStratReports.length}
                href="/income-strategy"
                ctaLabel="New analysis"
              />
              {incomeStratReports.length === 0
                ? <EmptySection href="/income-strategy" cta="Open Income Strategy Wizard" />
                : (
                  <div className="grid sm:grid-cols-2 gap-4">
                    {incomeStratReports.map(r => (
                      <ReportCard key={r.id} report={r} isPro={isPro}
                        onDelete={id => deleteReport.mutate(id)}
                        onUpgrade={() => setShowUpgradeModal(true)} />
                    ))}
                  </div>
                )}
            </section>

          </div>
        )}

        {!isLoading && isPro && (
          <p className="text-xs text-center mt-10" style={{ color: DIM }}>
            Reports are educational estimates only — not tax, legal, or financial advice.
          </p>
        )}

      </div>
    </AppLayout>
  );
}
