import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import {
  Shield, FileText, Download, Trash2, Eye, AlertTriangle,
  Database, Package, ChevronRight, Check, File, Clock,
  BarChart3, TrendingUp, Lock, RefreshCw, LogOut,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AppLayout } from "@/components/layout/AppLayout";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { CARD, CARD2, GOLD, GOLD_BORDER, GOLD_BG, GOLD_BG2, BORDER, MUTED, DIM, RED } from "@/lib/design";
import type { UploadedDocument, Report } from "@shared/schema";

// ── helpers ───────────────────────────────────────────────────────────────────

function fmt(d: string | Date) {
  return new Date(d).toLocaleDateString("en-CA", { year: "numeric", month: "short", day: "numeric" });
}

function fmtBytes(n: number | null | undefined) {
  if (!n) return "—";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

function rptId(id: number) {
  return `RPT-${String(id).padStart(5, "0")}`;
}

const FILE_ICON_COLOR: Record<string, string> = {
  pdf: "#f87171", csv: "#4ade80", xlsx: "#60a5fa",
  jpg: "#c084fc", png: "#c084fc",
};

// ── SectionCard ───────────────────────────────────────────────────────────────

function SectionCard({ icon: Icon, title, subtitle, children, danger }: {
  icon: React.ElementType; title: string; subtitle?: string;
  children: React.ReactNode; danger?: boolean;
}) {
  return (
    <div className="rounded-2xl border p-6"
      style={{ background: CARD, borderColor: danger ? "rgba(239,68,68,0.25)" : BORDER }}>
      <div className="flex items-center gap-3 mb-1">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
          style={{ background: danger ? "rgba(239,68,68,0.12)" : GOLD_BG2 }}>
          <Icon className="w-4 h-4" style={{ color: danger ? "#f87171" : GOLD }} />
        </div>
        <h2 className="font-bold text-white">{title}</h2>
      </div>
      {subtitle && <p className="text-sm mb-5 pl-11" style={{ color: MUTED }}>{subtitle}</p>}
      <div className="mt-5">{children}</div>
    </div>
  );
}

// ── Documents section ─────────────────────────────────────────────────────────

function DocumentsSection() {
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: docs = [], isLoading } = useQuery<Omit<UploadedDocument, "storedPath">[]>({
    queryKey: ["/api/documents"],
  });

  const deleteMut = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/documents/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/documents"] });
      toast({ title: "Document deleted" });
    },
    onError: () => toast({ title: "Could not delete document", variant: "destructive" }),
  });

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-12 rounded-xl animate-pulse" style={{ background: CARD2 }} />
        ))}
      </div>
    );
  }

  if (docs.length === 0) {
    return (
      <div className="rounded-xl border border-dashed p-8 text-center" style={{ borderColor: BORDER }}>
        <File className="w-8 h-8 mx-auto mb-2" style={{ color: DIM }} />
        <p className="text-sm font-semibold text-white mb-1">No uploaded documents</p>
        <p className="text-xs" style={{ color: DIM }}>Documents you upload to the Net Worth Builder will appear here.</p>
        <Link href="/net-worth">
          <Button size="sm" className="mt-4 font-semibold text-xs"
            style={{ background: GOLD, color: "#0D1929" }}>
            Open Net Worth Builder
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {docs.map(doc => (
        <div key={doc.id} className="rounded-xl border px-4 py-3 flex items-center gap-3"
          style={{ background: CARD2, borderColor: BORDER }}
          data-testid={`row-document-${doc.id}`}>
          <div className="w-7 h-7 rounded-md flex items-center justify-center shrink-0 text-xs font-bold"
            style={{ background: GOLD_BG, color: FILE_ICON_COLOR[doc.fileType] ?? GOLD }}>
            {doc.fileType.toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">{doc.originalName}</p>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-xs" style={{ color: DIM }}>{fmt(doc.createdAt)}</span>
              <span className="text-xs" style={{ color: DIM }}>·</span>
              <span className="text-xs" style={{ color: DIM }}>{fmtBytes(doc.fileSize)}</span>
              {doc.status === "done" && (
                <span className="text-xs px-1.5 py-0.5 rounded-full font-semibold"
                  style={{ background: "rgba(74,222,128,0.1)", color: "#4ade80" }}>
                  imported
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <a href={`/api/documents/${doc.id}/download`}
              target="_blank" rel="noopener noreferrer"
              data-testid={`button-download-doc-${doc.id}`}>
              <button className="p-1.5 rounded-lg hover:bg-white/5 transition-colors"
                style={{ color: MUTED }} title="Download original">
                <Download className="w-3.5 h-3.5" />
              </button>
            </a>
            <button
              className="p-1.5 rounded-lg hover:bg-red-500/10 transition-colors"
              style={{ color: "rgba(248,113,113,0.5)" }}
              title="Delete document"
              onClick={() => deleteMut.mutate(doc.id)}
              disabled={deleteMut.isPending}
              data-testid={`button-delete-doc-${doc.id}`}>
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      ))}
      <p className="text-xs pt-1" style={{ color: DIM }}>
        {docs.length} document{docs.length !== 1 ? "s" : ""} · Deleting removes the file from our servers permanently.
      </p>
    </div>
  );
}

// ── Reports section ───────────────────────────────────────────────────────────

function ReportsSection({ isPro }: { isPro: boolean }) {
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: reports = [], isLoading } = useQuery<Report[]>({
    queryKey: ["/api/reports"],
  });

  const deleteMut = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/reports/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/reports"] });
      toast({ title: "Report deleted" });
    },
    onError: () => toast({ title: "Could not delete report", variant: "destructive" }),
  });

  if (!isPro) {
    return (
      <div className="rounded-xl border p-6 text-center" style={{ background: CARD2, borderColor: GOLD_BORDER }}>
        <Lock className="w-6 h-6 mx-auto mb-2" style={{ color: GOLD }} />
        <p className="text-sm font-bold text-white mb-1">Reports are a Pro feature</p>
        <p className="text-xs mb-3" style={{ color: MUTED }}>
          Upgrade to save and export professional PDF reports.
        </p>
        <Link href="/pricing">
          <Button size="sm" className="font-bold text-xs"
            style={{ background: GOLD, color: "#0D1929" }}>
            View Pro Plans
          </Button>
        </Link>
      </div>
    );
  }

  if (isLoading) {
    return <div className="h-24 rounded-xl animate-pulse" style={{ background: CARD2 }} />;
  }

  if (reports.length === 0) {
    return (
      <div className="rounded-xl border border-dashed p-8 text-center" style={{ borderColor: BORDER }}>
        <BarChart3 className="w-8 h-8 mx-auto mb-2" style={{ color: DIM }} />
        <p className="text-sm font-semibold text-white mb-1">No saved reports</p>
        <p className="text-xs mb-3" style={{ color: DIM }}>Save your analyses as reports from the Net Worth or Income Strategy pages.</p>
        <Link href="/reports">
          <Button size="sm" className="font-semibold text-xs"
            style={{ background: GOLD, color: "#0D1929" }}>
            Open Reports
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {reports.map(r => (
        <div key={r.id} className="rounded-xl border px-4 py-3 flex items-center gap-3"
          style={{ background: CARD2, borderColor: BORDER }}
          data-testid={`row-report-${r.id}`}>
          <div className="w-7 h-7 rounded-md flex items-center justify-center shrink-0"
            style={{ background: GOLD_BG }}>
            {r.reportType === "net_worth"
              ? <BarChart3 className="w-3.5 h-3.5" style={{ color: GOLD }} />
              : <TrendingUp className="w-3.5 h-3.5" style={{ color: GOLD }} />}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">{r.title}</p>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-xs font-mono" style={{ color: DIM }}>{rptId(r.id)}</span>
              <span className="text-xs" style={{ color: DIM }}>·</span>
              <span className="text-xs" style={{ color: DIM }}>{fmt(r.createdAt)}</span>
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <Link href={`/reports/preview/${r.id}`}>
              <button className="p-1.5 rounded-lg hover:bg-white/5 transition-colors"
                style={{ color: MUTED }} title="View report"
                data-testid={`button-view-report-${r.id}`}>
                <Eye className="w-3.5 h-3.5" />
              </button>
            </Link>
            <button
              className="p-1.5 rounded-lg hover:bg-red-500/10 transition-colors"
              style={{ color: "rgba(248,113,113,0.5)" }}
              title="Delete report"
              onClick={() => deleteMut.mutate(r.id)}
              disabled={deleteMut.isPending}
              data-testid={`button-delete-report-${r.id}`}>
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      ))}
      <p className="text-xs pt-1" style={{ color: DIM }}>
        {reports.length} report{reports.length !== 1 ? "s" : ""} ·{" "}
        <Link href="/reports" className="hover:underline" style={{ color: GOLD }}>Open full Reports page</Link>
      </p>
    </div>
  );
}

// ── Export section ────────────────────────────────────────────────────────────

function ExportSection() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [exporting, setExporting] = useState(false);

  const handleExport = async () => {
    setExporting(true);
    try {
      const res = await fetch("/api/user/data-export", { credentials: "include" });
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `adavi-data-export-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast({ title: "Export complete", description: "Your data has been downloaded as JSON." });
    } catch {
      toast({ title: "Export failed", description: "Please try again or contact support.", variant: "destructive" });
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="rounded-xl border p-4" style={{ background: CARD2, borderColor: BORDER }}>
        <p className="text-sm font-bold text-white mb-1">Full Account Data Export (JSON)</p>
        <p className="text-xs mb-3 leading-relaxed" style={{ color: MUTED }}>
          Downloads a JSON file containing your profile, net worth data, income strategies, uploaded document metadata,
          and saved reports. Financial inputs are included as you entered them. This is your PIPEDA data access export.
        </p>
        <div className="flex flex-wrap gap-2 mb-4">
          {["Profile & settings", "Net worth items", "Income strategies", "Report metadata", "Document list"].map(t => (
            <span key={t} className="text-xs px-2 py-1 rounded-full border"
              style={{ background: GOLD_BG, borderColor: GOLD_BORDER, color: MUTED }}>
              <Check className="w-3 h-3 inline mr-1" style={{ color: GOLD }} />{t}
            </span>
          ))}
        </div>
        <Button
          size="sm"
          className="font-bold gap-1.5"
          style={{ background: GOLD, color: "#0D1929" }}
          onClick={handleExport}
          disabled={exporting}
          data-testid="button-export-data">
          <Package className="w-3.5 h-3.5" />
          {exporting ? "Preparing export…" : "Download My Data"}
        </Button>
      </div>

      <div className="rounded-xl border p-4" style={{ background: CARD2, borderColor: BORDER }}>
        <p className="text-sm font-bold text-white mb-1">PDF Reports Export</p>
        <p className="text-xs mb-3" style={{ color: MUTED }}>
          View and download individual PDF reports from the Reports page.
          Pro subscribers can access all saved report PDFs.
        </p>
        <Link href="/reports">
          <Button size="sm" variant="outline" className="font-bold gap-1.5 border text-white/70 hover:text-white"
            style={{ borderColor: BORDER }}
            data-testid="button-go-reports">
            <FileText className="w-3.5 h-3.5" />Open Reports Page
          </Button>
        </Link>
      </div>
    </div>
  );
}

// ── Delete account section ────────────────────────────────────────────────────

function DeleteAccountSection() {
  const { user, logout } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [step, setStep] = useState<"idle" | "confirm">("idle");
  const [confirmEmail, setConfirmEmail] = useState("");
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    if (confirmEmail.toLowerCase().trim() !== user?.email.toLowerCase()) {
      toast({ title: "Email doesn't match", description: "Please enter your account email to confirm.", variant: "destructive" });
      return;
    }
    setDeleting(true);
    try {
      const res = await fetch("/api/user/delete-account", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmEmail }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message || "Deletion failed");
      }
      toast({ title: "Account deleted", description: "All your data has been permanently removed." });
      navigate("/");
    } catch (err: any) {
      toast({ title: "Could not delete account", description: "Please try again. If the problem persists, contact support.", variant: "destructive" });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="rounded-xl border p-4" style={{ background: "rgba(239,68,68,0.05)", borderColor: "rgba(239,68,68,0.2)" }}>
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" style={{ color: "#f87171" }} />
          <div>
            <p className="text-sm font-bold text-white mb-1">This action is permanent and cannot be undone.</p>
            <p className="text-xs leading-relaxed" style={{ color: MUTED }}>
              Deleting your account will immediately and permanently remove: your profile and settings, all net worth data
              and items, all saved income strategies, all uploaded documents and their files from our servers,
              all saved reports, and your login credentials. Your Stripe subscription (if active) will be cancelled.
            </p>
          </div>
        </div>
      </div>

      {step === "idle" && (
        <Button
          variant="outline"
          className="border font-semibold gap-2 text-red-400/70 hover:text-red-400 hover:bg-red-500/5"
          style={{ borderColor: "rgba(239,68,68,0.25)" }}
          onClick={() => setStep("confirm")}
          data-testid="button-request-delete-account">
          <Trash2 className="w-4 h-4" />
          Delete My Account
        </Button>
      )}

      {step === "confirm" && (
        <div className="rounded-xl border p-5 space-y-4" style={{ background: CARD2, borderColor: "rgba(239,68,68,0.3)" }}>
          <p className="text-sm font-bold text-white">Confirm account deletion</p>
          <p className="text-xs leading-relaxed" style={{ color: MUTED }}>
            Type your email address <strong className="text-white">{user?.email}</strong> below to confirm.
          </p>
          <Input
            type="email"
            value={confirmEmail}
            onChange={e => setConfirmEmail(e.target.value)}
            placeholder={user?.email}
            className="border text-white placeholder:text-white/20"
            style={{ background: "rgba(255,255,255,0.05)", borderColor: "rgba(239,68,68,0.3)" }}
            data-testid="input-confirm-delete-email"
          />
          <div className="flex gap-3">
            <Button
              variant="outline"
              size="sm"
              className="border text-white/60 hover:text-white hover:bg-white/5"
              style={{ borderColor: BORDER }}
              onClick={() => { setStep("idle"); setConfirmEmail(""); }}
              data-testid="button-cancel-delete">
              Cancel
            </Button>
            <Button
              size="sm"
              className="font-bold gap-1.5"
              style={{ background: "#dc2626", color: "white" }}
              onClick={handleDelete}
              disabled={deleting || confirmEmail.toLowerCase().trim() !== user?.email.toLowerCase()}
              data-testid="button-confirm-delete-account">
              <Trash2 className="w-3.5 h-3.5" />
              {deleting ? "Deleting…" : "Permanently Delete Account"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function DataPrivacyCenter() {
  const { user } = useAuth();
  const isPro = user?.subscriptionStatus === "active" || user?.subscriptionStatus === "trialing";

  return (
    <AppLayout>
      <div className="container mx-auto px-4 py-10 max-w-3xl space-y-8">

        {/* Header */}
        <div className="mb-2">
          <div className="flex items-center gap-2.5 mb-1">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: GOLD_BG2 }}>
              <Shield className="w-4.5 h-4.5" style={{ color: GOLD }} />
            </div>
            <h1 className="text-2xl font-bold text-white">Data & Privacy Center</h1>
          </div>
          <p className="text-sm pl-12" style={{ color: MUTED }}>
            View, export, and manage all data adavi.ai holds about you. Your rights under PIPEDA.
          </p>
        </div>

        {/* Quick-stat bar */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { icon: Database, label: "Data encrypted", sub: "TLS + at-rest" },
            { icon: Lock, label: "No data sold", sub: "Privacy first" },
            { icon: RefreshCw, label: "Delete anytime", sub: "Within 30 days" },
          ].map(item => (
            <div key={item.label} className="rounded-xl border p-3.5 text-center"
              style={{ background: CARD, borderColor: BORDER }}>
              <item.icon className="w-4 h-4 mx-auto mb-1.5" style={{ color: GOLD }} />
              <p className="text-xs font-bold text-white">{item.label}</p>
              <p className="text-xs" style={{ color: DIM }}>{item.sub}</p>
            </div>
          ))}
        </div>

        {/* Uploaded documents */}
        <SectionCard
          icon={File}
          title="Uploaded Documents"
          subtitle="Files you have uploaded for AI-assisted net worth import. Deleting a document removes the file from our servers permanently.">
          <DocumentsSection />
        </SectionCard>

        {/* Saved reports */}
        <SectionCard
          icon={FileText}
          title="Saved Reports"
          subtitle="Financial reports you have saved. View the PDF preview or delete a report to remove it from your account.">
          <ReportsSection isPro={isPro} />
        </SectionCard>

        {/* Export */}
        <SectionCard
          icon={Package}
          title="Export Your Data"
          subtitle="Download a complete copy of your adavi.ai account data. This is your PIPEDA data portability export.">
          <ExportSection />
        </SectionCard>

        {/* Account deletion */}
        <SectionCard
          icon={Trash2}
          title="Account Deletion"
          subtitle="Permanently delete your account and all associated data. This cannot be undone."
          danger>
          <DeleteAccountSection />
        </SectionCard>

        {/* Footer */}
        <div className="rounded-xl border p-5 flex items-center justify-between gap-4"
          style={{ background: CARD, borderColor: BORDER }}>
          <div>
            <p className="text-sm font-bold text-white mb-0.5">Privacy questions?</p>
            <p className="text-xs" style={{ color: DIM }}>We respond within 5 business days.</p>
          </div>
          <div className="flex gap-2 shrink-0">
            <a href="mailto:adavi@adavi.ai"
              className="px-3 py-1.5 rounded-lg text-xs font-bold border hover:border-amber-400/40 transition-colors"
              style={{ borderColor: GOLD_BORDER, color: GOLD }}>
              adavi@adavi.ai
            </a>
            <Link href="/privacy">
              <button className="px-3 py-1.5 rounded-lg text-xs font-bold border hover:border-amber-400/40 transition-colors"
                style={{ borderColor: GOLD_BORDER, color: GOLD }}>
                Privacy Policy
              </button>
            </Link>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
