import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SignupGateModal } from "@/components/SignupGateModal";
import { NetWorthUpgradeModal } from "@/components/NetWorthUpgradeModal";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { BG, CARD, CARD2, GOLD, GOLD_BORDER, BORDER, MUTED, DIM } from "@/lib/design";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle, ArrowDownCircle, ArrowRight, ArrowUpCircle, Check, ChevronLeft,
  Crown, Download, FileText, Lock, Plus, RefreshCw, Save, Trash2, Upload,
} from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { Link } from "wouter";

type ItemType = "asset" | "liability";
type Step = "upload" | "review" | "builder";

type StatementLineItem = {
  id: string;
  documentId?: number | null;
  sourceType: "parsed" | "manual";
  investorName: string;
  familyName: string;
  institutionName: string;
  type: ItemType;
  category: string;
  subcategory: string;
  name: string;
  amount: string;
  priorValue: string;
  changeAmount: string;
  reportingPeriod: string;
  confidenceScore: number;
  verified: boolean;
  sourceTextSnippet: string;
  notes: string;
  needsReview: boolean;
  source?: string;
};

type ParsedDocument = {
  documentId?: number | null;
  originalName: string;
  status: "ready" | "needs-review" | "error";
  error?: string;
  warnings?: string[];
  saved?: boolean;
};

const GREEN = "#4ADE80";
const RED = "#F87171";
const ACCEPTED = ".pdf,.jpg,.jpeg,.png,.csv,.xlsx";
const MAX_SIZE = 10 * 1024 * 1024;
const DEFAULT_PERIOD = new Date().toISOString().slice(0, 7);

const CATEGORIES = [
  "Bank Accounts", "Cash", "Registered Accounts", "Investments", "Pension & Retirement",
  "Real Estate", "Vehicles", "Business Ownership", "Receivables", "Mortgages",
  "Credit Cards", "Loans & Lines of Credit", "Student Loans", "Taxes Owing", "Other",
];

const SUBCATEGORIES = [
  "Chequing", "Savings", "TFSA", "RRSP", "FHSA", "RESP", "Brokerage", "Primary Residence",
  "Rental Property", "Mortgage", "Line of Credit", "Credit Card", "Private Loan", "Other",
];

function makeId() {
  return Math.random().toString(36).slice(2, 10);
}

function fmt(n: number) {
  return "$" + Math.round(n).toLocaleString("en-CA", { maximumFractionDigits: 0 });
}

function fmtSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function money(v: string | number | undefined) {
  const n = Math.round(Number(v || 0));
  return Number.isFinite(n) ? n : 0;
}

function paid(user: any) {
  return user?.subscriptionStatus === "active" && (user?.planType === "monthly" || user?.planType === "annual");
}

function blankItem(type: ItemType = "asset"): StatementLineItem {
  return {
    id: makeId(),
    sourceType: "manual",
    investorName: "Primary Investor",
    familyName: "",
    institutionName: "",
    type,
    category: "Other",
    subcategory: "",
    name: "",
    amount: "",
    priorValue: "",
    changeAmount: "0",
    reportingPeriod: DEFAULT_PERIOD,
    confidenceScore: 100,
    verified: false,
    sourceTextSnippet: "",
    notes: "",
    needsReview: false,
  };
}

function normalizeParsedItem(raw: any): StatementLineItem {
  const amount = money(raw.amount);
  const priorValue = money(raw.priorValue);
  return {
    id: raw.tempId || makeId(),
    documentId: raw.documentId ?? null,
    sourceType: "parsed",
    investorName: raw.investorName || "Primary Investor",
    familyName: raw.familyName || "",
    institutionName: raw.institutionName || "",
    type: raw.type === "liability" ? "liability" : "asset",
    category: raw.category || "Other",
    subcategory: raw.subcategory || "",
    name: raw.name || "Review item",
    amount: String(amount || ""),
    priorValue: String(priorValue || ""),
    changeAmount: String(money(raw.changeAmount || amount - priorValue)),
    reportingPeriod: raw.reportingPeriod || DEFAULT_PERIOD,
    confidenceScore: Math.max(0, Math.min(100, Number(raw.confidenceScore ?? 60))),
    verified: !!raw.verified,
    sourceTextSnippet: raw.sourceTextSnippet || "",
    notes: raw.notes || "",
    needsReview: !!raw.needsReview || Number(raw.confidenceScore ?? 0) < 70,
    source: raw.source,
  };
}

function groupItems(items: StatementLineItem[]) {
  const grouped = new Map<string, Map<ItemType, Map<string, Map<string, StatementLineItem[]>>>>();
  for (const item of items) {
    const investor = item.investorName || "Primary Investor";
    const category = item.category || "Other";
    const subcategory = item.subcategory || "Other";
    if (!grouped.has(investor)) grouped.set(investor, new Map());
    const byType = grouped.get(investor)!;
    if (!byType.has(item.type)) byType.set(item.type, new Map());
    const byCategory = byType.get(item.type)!;
    if (!byCategory.has(category)) byCategory.set(category, new Map());
    const bySub = byCategory.get(category)!;
    if (!bySub.has(subcategory)) bySub.set(subcategory, []);
    bySub.get(subcategory)!.push(item);
  }
  return grouped;
}

function RowEditor({
  item, onChange, onDelete,
}: {
  item: StatementLineItem;
  onChange: (id: string, field: keyof StatementLineItem, value: string | boolean) => void;
  onDelete: (id: string) => void;
}) {
  const lowConfidence = item.confidenceScore < 70 || item.needsReview;
  const invalid = item.name.trim().length === 0 || money(item.amount) < 0;

  return (
    <div
      className="min-w-[1120px] grid grid-cols-[130px_125px_140px_115px_135px_130px_180px_110px_110px_105px_90px_44px] gap-2 items-center px-3 py-2 border-b"
      style={{ borderColor: BORDER, background: lowConfidence ? "rgba(251,191,36,0.07)" : "transparent" }}
    >
      <Input value={item.investorName} onChange={e => onChange(item.id, "investorName", e.target.value)} className="h-8 bg-white/5 border-white/10 text-white" />
      <select value={item.type} onChange={e => onChange(item.id, "type", e.target.value)} className="h-8 rounded-md border px-2 text-sm text-white" style={{ background: CARD2, borderColor: BORDER }}>
        <option value="asset">Asset</option>
        <option value="liability">Liability</option>
      </select>
      <Input value={item.institutionName} onChange={e => onChange(item.id, "institutionName", e.target.value)} className="h-8 bg-white/5 border-white/10 text-white" />
      <Input value={item.reportingPeriod} onChange={e => onChange(item.id, "reportingPeriod", e.target.value)} className="h-8 bg-white/5 border-white/10 text-white" placeholder="YYYY-MM" />
      <select value={item.category} onChange={e => onChange(item.id, "category", e.target.value)} className="h-8 rounded-md border px-2 text-sm text-white" style={{ background: CARD2, borderColor: BORDER }}>
        {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
      </select>
      <select value={item.subcategory} onChange={e => onChange(item.id, "subcategory", e.target.value)} className="h-8 rounded-md border px-2 text-sm text-white" style={{ background: CARD2, borderColor: BORDER }}>
        <option value="">None</option>
        {SUBCATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
      </select>
      <Input value={item.name} onChange={e => onChange(item.id, "name", e.target.value)} className={`h-8 bg-white/5 text-white ${invalid ? "border-red-400/50" : "border-white/10"}`} />
      <Input type="number" min={0} value={item.amount} onChange={e => onChange(item.id, "amount", e.target.value)} className="h-8 bg-white/5 border-white/10 text-white text-right" />
      <Input type="number" min={0} value={item.priorValue} onChange={e => onChange(item.id, "priorValue", e.target.value)} className="h-8 bg-white/5 border-white/10 text-white text-right" />
      <Input type="number" value={item.changeAmount} onChange={e => onChange(item.id, "changeAmount", e.target.value)} className="h-8 bg-white/5 border-white/10 text-white text-right" />
      <button
        onClick={() => onChange(item.id, "verified", !item.verified)}
        className="h-8 rounded-md border text-xs font-bold"
        style={{
          borderColor: item.verified ? "rgba(74,222,128,0.35)" : BORDER,
          background: item.verified ? "rgba(74,222,128,0.12)" : "rgba(255,255,255,0.04)",
          color: item.verified ? GREEN : MUTED,
        }}
      >
        {item.verified ? "Verified" : `${item.confidenceScore}%`}
      </button>
      <button onClick={() => onDelete(item.id)} className="text-red-300/60 hover:text-red-300">
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  );
}

export default function NetWorth() {
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<Step>("upload");
  const [dragging, setDragging] = useState(false);
  const [showSignupGate, setShowSignupGate] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [documents, setDocuments] = useState<ParsedDocument[]>([]);
  const [reviewItems, setReviewItems] = useState<StatementLineItem[]>([]);
  const [allItems, setAllItems] = useState<StatementLineItem[]>([]);
  const [familyName, setFamilyName] = useState("");
  const [reportingPeriod, setReportingPeriod] = useState(DEFAULT_PERIOD);
  const [selectedInvestor, setSelectedInvestor] = useState("combined");
  const [parsing, setParsing] = useState(false);
  const isPro = paid(user);

  const visibleItems = selectedInvestor === "combined"
    ? allItems
    : allItems.filter(i => (i.investorName || "Primary Investor") === selectedInvestor);
  const investors = Array.from(new Set(allItems.map(i => i.investorName || "Primary Investor")));
  const assets = visibleItems.filter(i => i.type === "asset");
  const liabilities = visibleItems.filter(i => i.type === "liability");
  const totalAssets = assets.reduce((sum, item) => sum + money(item.amount), 0);
  const totalLiabilities = liabilities.reduce((sum, item) => sum + money(item.amount), 0);
  const priorNetWorth = visibleItems.reduce((sum, item) => sum + (item.type === "asset" ? money(item.priorValue) : -money(item.priorValue)), 0);
  const netWorth = totalAssets - totalLiabilities;
  const netWorthChange = netWorth - priorNetWorth;
  const grouped = useMemo(() => groupItems(visibleItems), [visibleItems]);

  function updateReviewItem(id: string, field: keyof StatementLineItem, value: string | boolean) {
    setReviewItems(prev => prev.map(item => {
      if (item.id !== id) return item;
      const next = { ...item, [field]: value } as StatementLineItem;
      if (field === "amount" || field === "priorValue") next.changeAmount = String(money(next.amount) - money(next.priorValue));
      return next;
    }));
  }

  function updateItem(id: string, field: keyof StatementLineItem, value: string | boolean) {
    setAllItems(prev => prev.map(item => {
      if (item.id !== id) return item;
      const next = { ...item, [field]: value } as StatementLineItem;
      if (field === "amount" || field === "priorValue") next.changeAmount = String(money(next.amount) - money(next.priorValue));
      return next;
    }));
  }

  async function handleFiles(fileList: FileList | null) {
    if (!fileList) return;
    if (!user) { setShowSignupGate(true); return; }
    const files = Array.from(fileList);
    const invalid = files.find(file => file.size > MAX_SIZE || !ACCEPTED.split(",").some(ext => file.name.toLowerCase().endsWith(ext.replace(".", "")) || file.name.toLowerCase().endsWith(ext)));
    if (invalid) {
      toast({ title: "Unsupported file", description: "Upload PDF, JPG, PNG, CSV, or XLSX files up to 10 MB.", variant: "destructive" });
      return;
    }

    const form = new FormData();
    files.forEach(file => form.append("files", file));
    setParsing(true);
    setDocuments(files.map(file => ({ originalName: file.name, status: "ready", warnings: [`${fmtSize(file.size)} queued for parsing`] })));

    try {
      const res = await fetch("/api/net-worth/parse", { method: "POST", body: form, credentials: "include" });
      if (!res.ok) {
        const error = await res.json().catch(() => ({ message: "Parsing failed." }));
        throw new Error(error.message || "Parsing failed.");
      }
      const payload = await res.json();
      setDocuments(payload.documents || []);
      const parsed = (payload.items || []).map(normalizeParsedItem);
      setReviewItems(parsed.length ? parsed : [blankItem("asset")]);
      setStep("review");
      toast({
        title: parsed.length ? "Document parsed" : "Review needed",
        description: parsed.length ? `${parsed.length} line item${parsed.length === 1 ? "" : "s"} ready for review.` : "No line items were detected. Add rows manually.",
      });
    } catch (err: any) {
      toast({ title: "Could not parse upload", description: err.message, variant: "destructive" });
      setDocuments(files.map(file => ({ originalName: file.name, status: "error", error: err.message })));
    } finally {
      setParsing(false);
    }
  }

  function confirmReview() {
    const valid = reviewItems.filter(item => item.name.trim() && money(item.amount) >= 0);
    if (valid.length === 0) {
      toast({ title: "Add at least one valid row", variant: "destructive" });
      return;
    }
    setAllItems(prev => [...prev, ...valid]);
    setReviewItems([]);
    setDocuments([]);
    setStep("builder");
  }

  function addManualItem(type: ItemType = "asset") {
    const item = { ...blankItem(type), familyName, reportingPeriod };
    if (step === "review") setReviewItems(prev => [...prev, item]);
    else {
      setAllItems(prev => [...prev, item]);
      setStep("builder");
    }
  }

  const saveStatement = useMutation({
    mutationFn: async () => {
      const payload = {
        title: `Statement of Net Worth - ${reportingPeriod}`,
        familyName,
        reportingPeriod,
        totalAssets: Math.round(totalAssets),
        totalLiabilities: Math.round(totalLiabilities),
        items: allItems.map(item => ({
          documentId: item.documentId ?? null,
          sourceType: item.sourceType,
          investorName: item.investorName,
          familyName: item.familyName || familyName,
          institutionName: item.institutionName,
          type: item.type,
          category: item.category || "Other",
          subcategory: item.subcategory,
          name: item.name,
          amount: money(item.amount),
          priorValue: money(item.priorValue),
          changeAmount: money(item.changeAmount),
          reportingPeriod: item.reportingPeriod || reportingPeriod,
          confidenceScore: item.confidenceScore,
          verified: item.verified,
          sourceTextSnippet: item.sourceTextSnippet,
          notes: item.notes,
        })),
      };
      return apiRequest("POST", "/api/net-worth/save", payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/net-worth"] });
      qc.invalidateQueries({ queryKey: ["/api/reports"] });
      toast({ title: "Statement saved" });
    },
    onError: (err: any) => toast({ title: "Could not save", description: err.message, variant: "destructive" }),
  });

  async function handleSave() {
    if (!user) { setShowSignupGate(true); return; }
    if (!isPro) { setShowUpgradeModal(true); return; }
    saveStatement.mutate();
  }

  async function handleExport() {
    if (!user) { setShowSignupGate(true); return; }
    try {
      await apiRequest("POST", "/api/net-worth/export-check", {});
      window.print();
    } catch {
      setShowUpgradeModal(true);
    }
  }

  const assetShare = totalAssets + totalLiabilities === 0 ? 50 : (totalAssets / (totalAssets + totalLiabilities)) * 100;

  return (
    <AppLayout>
      <style>{`
        @media print {
          nav, header, .no-print { display: none !important; }
          body { background: white !important; color: black !important; }
          .print-panel { background: white !important; color: #111827 !important; border-color: #d1d5db !important; }
          .print-text { color: #111827 !important; }
        }
      `}</style>
      <SignupGateModal open={showSignupGate} onClose={() => setShowSignupGate(false)} title="Create a Free Account to Upload" description="Sign up to upload your documents and build your net worth statement." />
      <NetWorthUpgradeModal open={showUpgradeModal} onClose={() => setShowUpgradeModal(false)} />

      <div className="container mx-auto px-4 py-10 max-w-7xl">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border mb-4 text-xs font-semibold" style={{ background: "rgba(197,163,90,0.08)", borderColor: GOLD_BORDER, color: GOLD }}>
            Statement of Net Worth
          </div>
          <h1 className="text-3xl sm:text-5xl font-bold text-white mb-3">Create a Professional Net Worth Statement</h1>
          <p className="text-base max-w-2xl mx-auto" style={{ color: MUTED }}>Upload statements, review extracted rows, or enter numbers manually.</p>
        </div>

        <div className="grid grid-cols-3 gap-2 mb-8 no-print">
          {["Upload", "Review", "Net Worth"].map((label, idx) => {
            const active = (idx === 0 && step === "upload") || (idx === 1 && step === "review") || (idx === 2 && step === "builder");
            return (
              <div key={label} className="rounded-lg border px-3 py-2 text-center text-sm font-bold" style={{ borderColor: active ? GOLD_BORDER : BORDER, background: active ? "rgba(197,163,90,0.12)" : CARD, color: active ? GOLD : MUTED }}>
                {idx + 1}. {label}
              </div>
            );
          })}
        </div>

        {step === "upload" && (
          <div className="grid lg:grid-cols-[1.1fr_0.9fr] gap-6">
            <div
              onDragOver={e => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={e => { e.preventDefault(); setDragging(false); handleFiles(e.dataTransfer.files); }}
              onClick={() => fileInputRef.current?.click()}
              className="min-h-[360px] rounded-2xl border-2 border-dashed flex flex-col items-center justify-center text-center cursor-pointer transition-colors"
              style={{ borderColor: dragging ? GOLD : GOLD_BORDER, background: dragging ? "rgba(197,163,90,0.10)" : CARD }}
            >
              <input ref={fileInputRef} type="file" className="hidden" multiple accept={ACCEPTED} onChange={e => { handleFiles(e.target.files); e.target.value = ""; }} />
              <Upload className="w-12 h-12 mb-4" style={{ color: GOLD }} />
              <p className="text-xl font-bold text-white mb-2">{parsing ? "Parsing documents..." : "Drop files here or browse"}</p>
              <p className="text-sm max-w-md" style={{ color: MUTED }}>PDF, JPG, PNG, CSV, XLSX, OCR scans, and Adobe-exported statements up to 10 MB each.</p>
              {parsing && <RefreshCw className="w-6 h-6 mt-6 animate-spin" style={{ color: GOLD }} />}
            </div>

            <div className="rounded-2xl border p-6" style={{ background: CARD, borderColor: BORDER }}>
              <h2 className="text-lg font-bold text-white mb-4">Manual Entry</h2>
              <div className="grid gap-3 mb-4">
                <Input value={familyName} onChange={e => setFamilyName(e.target.value)} placeholder="Family or group name" className="bg-white/5 border-white/10 text-white" />
                <Input value={reportingPeriod} onChange={e => setReportingPeriod(e.target.value)} placeholder="Reporting period, e.g. 2026-07" className="bg-white/5 border-white/10 text-white" />
              </div>
              <div className="flex flex-wrap gap-3">
                <Button onClick={() => addManualItem("asset")} className="font-bold" style={{ background: "rgba(74,222,128,0.12)", color: GREEN, border: "1px solid rgba(74,222,128,0.3)" }}>
                  <Plus className="w-4 h-4 mr-1.5" />Add Asset
                </Button>
                <Button onClick={() => addManualItem("liability")} className="font-bold" style={{ background: "rgba(248,113,113,0.12)", color: RED, border: "1px solid rgba(248,113,113,0.3)" }}>
                  <Plus className="w-4 h-4 mr-1.5" />Add Liability
                </Button>
              </div>
              {documents.length > 0 && (
                <div className="mt-6 space-y-2">
                  {documents.map(doc => (
                    <div key={doc.originalName} className="rounded-lg border p-3 text-sm" style={{ borderColor: BORDER, background: CARD2 }}>
                      <p className="font-semibold text-white">{doc.originalName}</p>
                      <p style={{ color: doc.status === "error" ? RED : MUTED }}>{doc.error || doc.warnings?.[0] || doc.status}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {step === "review" && (
          <div className="rounded-2xl border overflow-hidden" style={{ background: CARD, borderColor: BORDER }}>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 border-b" style={{ borderColor: BORDER }}>
              <div>
                <h2 className="text-xl font-bold text-white">Review Extracted Line Items</h2>
                <p className="text-sm" style={{ color: MUTED }}>Low-confidence rows are highlighted. Amend values and mark rows verified before generating the statement.</p>
              </div>
              <Button onClick={() => addManualItem("asset")} variant="outline" className="text-white border" style={{ borderColor: GOLD_BORDER }}>
                <Plus className="w-4 h-4 mr-1.5" />Add Row
              </Button>
            </div>
            {reviewItems.length === 0 ? (
              <div className="p-12 text-center">
                <FileText className="w-10 h-10 mx-auto mb-3" style={{ color: DIM }} />
                <p className="text-white font-semibold">No rows yet</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <div className="min-w-[1120px] grid grid-cols-[130px_125px_140px_115px_135px_130px_180px_110px_110px_105px_90px_44px] gap-2 px-3 py-3 text-xs uppercase tracking-wider font-bold" style={{ color: DIM, background: "rgba(255,255,255,0.03)" }}>
                  <span>Investor</span><span>Status</span><span>Institution</span><span>Period</span><span>Category</span><span>Subcategory</span><span>Description</span><span className="text-right">Current</span><span className="text-right">Prior</span><span className="text-right">Change</span><span>Check</span><span />
                </div>
                {reviewItems.map(item => <RowEditor key={item.id} item={item} onChange={updateReviewItem} onDelete={id => setReviewItems(prev => prev.filter(i => i.id !== id))} />)}
              </div>
            )}
            <div className="flex flex-wrap gap-3 p-5 border-t" style={{ borderColor: BORDER }}>
              <Button onClick={confirmReview} className="font-bold" style={{ background: GOLD, color: BG }}>
                <Check className="w-4 h-4 mr-1.5" />Generate Statement
              </Button>
              <Button variant="outline" onClick={() => setStep("upload")} className="border text-white/70" style={{ borderColor: BORDER }}>
                <ChevronLeft className="w-4 h-4 mr-1" />Back
              </Button>
            </div>
          </div>
        )}

        {step === "builder" && (
          <>
            <div className="grid md:grid-cols-3 gap-4 mb-6">
              {[
                ["Assets", totalAssets, GREEN, <ArrowUpCircle className="w-5 h-5" />],
                ["Net Worth", netWorth, GOLD, <Crown className="w-5 h-5" />],
                ["Liabilities", totalLiabilities, RED, <ArrowDownCircle className="w-5 h-5" />],
              ].map(([label, value, color, icon]) => (
                <div key={String(label)} className="rounded-2xl border p-5 print-panel" style={{ background: label === "Net Worth" ? "white" : CARD, borderColor: label === "Net Worth" ? GOLD : BORDER }}>
                  <div className="flex items-center gap-2 mb-3" style={{ color: color as string }}>{icon}<p className="text-xs font-bold uppercase tracking-widest">{String(label)}</p></div>
                  <p className="text-3xl font-extrabold print-text" style={{ color: label === "Net Worth" ? BG : "white" }}>{fmt(Number(value))}</p>
                </div>
              ))}
            </div>

            <div className="grid lg:grid-cols-[260px_1fr] gap-4 mb-6 no-print">
              <div className="rounded-xl border p-4" style={{ background: CARD, borderColor: BORDER }}>
                <label className="text-xs font-bold uppercase tracking-wider" style={{ color: DIM }}>Statement View</label>
                <select value={selectedInvestor} onChange={e => setSelectedInvestor(e.target.value)} className="w-full mt-2 h-10 rounded-lg border px-3 text-white" style={{ background: CARD2, borderColor: BORDER }}>
                  <option value="combined">Combined Family</option>
                  {investors.map(name => <option key={name} value={name}>{name}</option>)}
                </select>
              </div>
              <div className="rounded-xl border p-4 grid sm:grid-cols-2 gap-3" style={{ background: CARD, borderColor: BORDER }}>
                <Input value={familyName} onChange={e => setFamilyName(e.target.value)} placeholder="Family/group name" className="bg-white/5 border-white/10 text-white" />
                <Input value={reportingPeriod} onChange={e => setReportingPeriod(e.target.value)} placeholder="Statement period" className="bg-white/5 border-white/10 text-white" />
              </div>
            </div>

            <div className="grid lg:grid-cols-[1fr_360px] gap-6">
              <div className="rounded-2xl border p-5 print-panel" style={{ background: CARD, borderColor: BORDER }}>
                <div className="mb-5">
                  <h2 className="text-2xl font-bold text-white print-text">Statement of Net Worth</h2>
                  <p className="text-sm print-text" style={{ color: MUTED }}>As of {reportingPeriod || DEFAULT_PERIOD} {familyName ? `for ${familyName}` : ""}</p>
                </div>
                {visibleItems.length === 0 ? (
                  <div className="py-12 text-center">
                    <AlertCircle className="w-10 h-10 mx-auto mb-3" style={{ color: DIM }} />
                    <p className="font-semibold text-white print-text">No statement rows yet</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {Array.from(grouped.entries()).map(([investor, byType]) => (
                      <details key={investor} open className="rounded-xl border p-3" style={{ borderColor: BORDER }}>
                        <summary className="cursor-pointer font-bold text-white print-text">{investor}</summary>
                        {(["asset", "liability"] as ItemType[]).map(type => {
                          const byCategory = byType.get(type);
                          if (!byCategory) return null;
                          return (
                            <div key={type} className="mt-3">
                              <p className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: type === "asset" ? GREEN : RED }}>{type === "asset" ? "Assets" : "Liabilities"}</p>
                              {Array.from(byCategory.entries()).map(([category, bySub]) => (
                                <details key={category} open className="ml-2 mb-2">
                                  <summary className="cursor-pointer text-sm font-semibold text-white print-text">{category}</summary>
                                  {Array.from(bySub.entries()).map(([sub, rows]) => (
                                    <div key={sub} className="ml-4 mt-2">
                                      <p className="text-xs font-semibold mb-1" style={{ color: DIM }}>{sub || "Other"}</p>
                                      {rows.map(row => (
                                        <div key={row.id} className="grid grid-cols-[1fr_110px_110px_110px] gap-2 py-1.5 border-b text-sm" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
                                          <span className="text-white print-text">{row.name}<span style={{ color: DIM }}> {row.institutionName ? `- ${row.institutionName}` : ""}</span></span>
                                          <span className="text-right print-text">{fmt(money(row.amount))}</span>
                                          <span className="text-right print-text">{fmt(money(row.priorValue))}</span>
                                          <span className="text-right" style={{ color: money(row.changeAmount) >= 0 ? GREEN : RED }}>{fmt(money(row.changeAmount))}</span>
                                        </div>
                                      ))}
                                    </div>
                                  ))}
                                </details>
                              ))}
                            </div>
                          );
                        })}
                      </details>
                    ))}
                  </div>
                )}
              </div>

              <div className="rounded-2xl border p-5 print-panel" style={{ background: CARD, borderColor: BORDER }}>
                <h2 className="text-lg font-bold text-white mb-4 print-text">Net Worth Variance Analysis</h2>
                <div className="w-48 h-48 rounded-full mx-auto mb-5" style={{ background: `conic-gradient(${GOLD} 0 ${assetShare}%, ${RED} ${assetShare}% 100%)` }} />
                <div className="space-y-3">
                  <div className="flex justify-between text-sm"><span style={{ color: MUTED }}>Assets</span><b className="text-white print-text">{fmt(totalAssets)}</b></div>
                  <div className="flex justify-between text-sm"><span style={{ color: MUTED }}>Liabilities</span><b className="text-white print-text">{fmt(totalLiabilities)}</b></div>
                  <div className="flex justify-between text-sm"><span style={{ color: MUTED }}>Prior net worth</span><b className="text-white print-text">{fmt(priorNetWorth)}</b></div>
                  <div className="flex justify-between text-sm border-t pt-3" style={{ borderColor: BORDER }}><span style={{ color: MUTED }}>Net worth change</span><b style={{ color: netWorthChange >= 0 ? GREEN : RED }}>{fmt(netWorthChange)}</b></div>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-3 mt-6 no-print">
              <Button variant="outline" onClick={() => setStep("upload")} className="border text-white/70" style={{ borderColor: BORDER }}>
                <ChevronLeft className="w-4 h-4 mr-1" />Upload More
              </Button>
              <Button onClick={() => addManualItem("asset")} className="font-semibold" style={{ background: "rgba(255,255,255,0.07)", color: "white", border: `1px solid ${BORDER}` }}>
                <Plus className="w-4 h-4 mr-1.5" />Add Manual Row
              </Button>
              <Button onClick={() => setStep("review")} variant="outline" className="border text-white/70" style={{ borderColor: BORDER }}>
                <RefreshCw className="w-4 h-4 mr-1.5" />Review Rows
              </Button>
              <Button onClick={handleSave} disabled={saveStatement.isPending || allItems.length === 0} className="font-semibold" style={{ background: isPro ? "rgba(255,255,255,0.07)" : "rgba(197,163,90,0.08)", color: isPro ? "white" : GOLD, border: `1px solid ${isPro ? BORDER : GOLD_BORDER}` }}>
                {!isPro ? <Lock className="w-4 h-4 mr-1.5" /> : <Save className="w-4 h-4 mr-1.5" />}
                {saveStatement.isPending ? "Saving..." : isPro ? "Save Statement" : "Save (Premium)"}
              </Button>
              <Button onClick={handleExport} className="font-semibold" style={{ background: isPro ? GOLD : "rgba(197,163,90,0.12)", color: isPro ? BG : GOLD }}>
                {!isPro ? <Lock className="w-4 h-4 mr-1.5" /> : <Download className="w-4 h-4 mr-1.5" />}Print / Download
              </Button>
            </div>

            {!isPro && (
              <div className="rounded-2xl border p-5 mt-5 no-print" style={{ background: "rgba(197,163,90,0.06)", borderColor: GOLD_BORDER }}>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <Crown className="w-6 h-6 shrink-0" style={{ color: GOLD }} />
                    <p className="text-sm text-white">Viewing is free. Upgrade to save reports, download PDFs, and print statements.</p>
                  </div>
                  <Link href="/pricing">
                    <Button size="sm" className="font-bold whitespace-nowrap" style={{ background: GOLD, color: BG }}>Upgrade</Button>
                  </Link>
                </div>
              </div>
            )}
          </>
        )}

        <p className="text-center text-xs mt-10" style={{ color: DIM }}>
          Educational estimates only. Not tax, legal, accounting, or investment advice.
        </p>
      </div>
    </AppLayout>
  );
}
