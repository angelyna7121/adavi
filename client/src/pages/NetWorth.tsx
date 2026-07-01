import { AppLayout } from "@/components/layout/AppLayout";
import { useState, useRef, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/use-auth";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Upload, Plus, Trash2, Download, Save, Lock, RefreshCw, Crown,
  FileText, AlertCircle, Check, ChevronRight, ChevronLeft,
  ArrowRight, Edit2, X, Eye, Image, ArrowUpCircle, ArrowDownCircle,
} from "lucide-react";
import { Link, useLocation } from "wouter";
import * as XLSX from "xlsx";
import { BG, CARD, CARD2, GOLD, GOLD_BORDER, BORDER, MUTED, DIM } from "@/lib/design";
import { SignupGateModal } from "@/components/SignupGateModal";
import { NetWorthUpgradeModal } from "@/components/NetWorthUpgradeModal";


type ItemType = "asset" | "liability";

type LineItem = {
  id: string;
  label: string;
  amount: string;
  category: string;
  itemType: ItemType;
  notes: string;
  needsReview: boolean;
  source?: string;
};

type UploadedFile = {
  id: string;
  name: string;
  size: number;
  type: string;
  status: "uploading" | "reading" | "extracting" | "ready" | "needs-review" | "failed";
  items: LineItem[];
  error?: string;
};

const STATUSES: Record<UploadedFile["status"], string> = {
  uploading: "Uploading…",
  reading: "Reading document…",
  extracting: "Extracting financial details…",
  ready: "Ready for review",
  "needs-review": "Needs manual review",
  failed: "Failed",
};

const STATUS_COLORS: Record<UploadedFile["status"], string> = {
  uploading: MUTED,
  reading: MUTED,
  extracting: GOLD,
  ready: "#4ADE80",
  "needs-review": "#FBBF24",
  failed: "#F87171",
};

function makeId() { return Math.random().toString(36).slice(2, 9); }

function fmt(n: number) {
  return "$" + n.toLocaleString("en-CA", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function fmtSize(bytes: number) {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}

function classifyLabel(label: string): ItemType {
  const l = label.toLowerCase();
  const liabilityWords = ["mortgage balance", "mortgage payable", "home mortgage", "rental mortgage", "loan balance",
    "amount owing", "debt", "credit card", "line of credit", "student loan", "car loan", "tax payable",
    "business loan", "shareholder loan payable"];
  for (const w of liabilityWords) { if (l.includes(w)) return "liability"; }
  return "asset";
}

function parseCSVText(text: string, fileName: string): LineItem[] {
  const lines = text.split(/\r?\n/).filter(l => l.trim());
  const items: LineItem[] = [];
  const firstRow = lines[0]?.toLowerCase() || "";
  const hasHeader = firstRow.includes("description") || firstRow.includes("label") || firstRow.includes("name") || firstRow.includes("amount") || firstRow.includes("type");
  const dataLines = hasHeader ? lines.slice(1) : lines;

  dataLines.forEach(line => {
    const cols = line.split(/[,\t]/).map(c => c.replace(/^"|"$/g, "").trim());
    if (cols.length < 2) return;
    const label = cols[0];
    let amountStr = "";
    let typeHint: ItemType | null = null;
    let category = "";
    let notes = "";

    for (let i = 1; i < cols.length; i++) {
      const cleaned = cols[i].replace(/[$,\s]/g, "");
      const lower = cols[i].toLowerCase();
      if (!isNaN(parseFloat(cleaned)) && cleaned !== "" && amountStr === "") amountStr = cleaned;
      if (lower === "asset") typeHint = "asset";
      if (lower === "liability" || lower === "debt") typeHint = "liability";
      if (i === 2 && !["asset","liability","debt"].includes(lower)) category = cols[i];
      if (i === 3) notes = cols[i];
    }

    if (!label || amountStr === "") return;
    const amount = parseFloat(amountStr);
    const itemType: ItemType = typeHint ?? (amount < 0 ? "liability" : classifyLabel(label));
    items.push({ id: makeId(), label, amount: Math.abs(amount).toString(), category, itemType, notes, needsReview: false, source: fileName });
  });
  return items;
}

function parseXLSXBuffer(buf: ArrayBuffer, fileName: string): LineItem[] {
  const wb = XLSX.read(buf, { type: "array" });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows: string[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" }) as string[][];
  if (rows.length < 2) return [];

  const headerRow = rows[0].map(h => String(h).toLowerCase().trim());
  const descIdx = headerRow.findIndex(h => ["description","name","account","item","label"].some(k => h.includes(k)));
  const amtIdx = headerRow.findIndex(h => ["amount","balance","market value","value","mortgage balance","loan balance"].some(k => h.includes(k)));
  const typeIdx = headerRow.findIndex(h => ["type","category","class"].some(k => h.includes(k)));
  const notesIdx = headerRow.findIndex(h => ["notes","note","comment"].some(k => h.includes(k)));

  const items: LineItem[] = [];
  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    const label = String(row[descIdx] ?? row[0] ?? "").trim();
    const amtRaw = String(row[amtIdx >= 0 ? amtIdx : 1] ?? "").replace(/[$,\s]/g, "");
    const typeRaw = String(row[typeIdx] ?? "").toLowerCase().trim();
    const notes = notesIdx >= 0 ? String(row[notesIdx] ?? "") : "";
    if (!label || !amtRaw || isNaN(parseFloat(amtRaw))) continue;
    const amount = parseFloat(amtRaw);
    const itemType: ItemType = typeRaw === "liability" || typeRaw === "debt" ? "liability"
      : typeRaw === "asset" ? "asset"
      : amount < 0 ? "liability"
      : classifyLabel(label);
    items.push({ id: makeId(), label, amount: Math.abs(amount).toString(), category: "", itemType, notes, needsReview: false, source: fileName });
  }
  return items;
}

const CATEGORIES = [
  "Bank Accounts", "Cash", "Savings",
  "RRSP", "TFSA", "FHSA", "RESP", "RRIF", "LIRA", "GIC",
  "Investments", "Stocks", "ETFs", "Mutual Funds", "Bonds",
  "Cryptocurrency", "Precious Metals", "Pension & Retirement",
  "Real Estate", "Investment Property", "Vehicles",
  "Business Ownership", "Corporation Shares",
  "Mortgage Investment", "Private Lending", "Receivables",
  "Mortgage Debt", "Credit Cards", "Car Loan",
  "Student Loans", "Business Loan", "Loans & Lines of Credit",
  "Taxes Owing", "Other",
];

const GREEN = "#4ADE80";
const RED   = "#F87171";

function ManualItemCard({ item, onChange, onDelete, onFlipType }: {
  item: LineItem;
  onChange: (id: string, field: keyof LineItem, v: string) => void;
  onDelete: (id: string) => void;
  onFlipType: (id: string) => void;
}) {
  const isAsset = item.itemType === "asset";
  const [notesOpen, setNotesOpen] = useState(!!item.notes);

  return (
    <div
      className="rounded-xl border mb-3 overflow-hidden"
      style={{ background: "rgba(255,255,255,0.02)", borderColor: BORDER }}
      data-testid={`item-card-${item.id}`}
    >
      {/* Row 1: Name + Type + Delete */}
      <div className="flex items-center gap-3 px-4 pt-3.5 pb-2">
        <Input
          value={item.label}
          onChange={e => onChange(item.id, "label", e.target.value)}
          className="flex-1 h-auto text-base font-semibold border-0 bg-transparent text-white placeholder:text-white/20 focus-visible:ring-0 px-0 py-0"
          placeholder="Item name"
          data-testid={`input-label-${item.id}`}
        />
        <button
          onClick={() => onFlipType(item.id)}
          className="flex items-center gap-1.5 text-xs font-bold rounded-xl px-3 py-1.5 shrink-0 transition-colors"
          style={{
            background: isAsset ? "rgba(74,222,128,0.1)" : "rgba(248,113,113,0.1)",
            color: isAsset ? GREEN : RED,
          }}
          data-testid={`button-type-${item.id}`}
        >
          {isAsset ? <ArrowUpCircle className="w-3.5 h-3.5" /> : <ArrowDownCircle className="w-3.5 h-3.5" />}
          {isAsset ? "Asset" : "Liability"}
        </button>
        <button
          onClick={() => onDelete(item.id)}
          className="text-white/20 hover:text-red-400 transition-colors shrink-0"
          data-testid={`button-delete-${item.id}`}
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Row 2: Category + Amount */}
      <div className="grid grid-cols-2 gap-3 px-4 pb-3" style={{ borderBottom: `1px solid ${BORDER}` }}>
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: DIM }}>
            Category
          </label>
          <select
            value={item.category}
            onChange={e => onChange(item.id, "category", e.target.value)}
            className="w-full text-sm text-white rounded-lg px-2 py-1.5 outline-none border"
            style={{ background: "rgba(255,255,255,0.04)", borderColor: BORDER }}
            data-testid={`select-category-${item.id}`}
          >
            <option value="" style={{ background: "#1e2535" }}>Select…</option>
            {CATEGORIES.map(c => (
              <option key={c} value={c} style={{ background: "#1e2535" }}>{c}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: DIM }}>
            Amount
          </label>
          <div className="flex items-center border rounded-lg px-2 py-1.5" style={{ borderColor: BORDER, background: "rgba(255,255,255,0.04)" }}>
            <span className="text-sm mr-1 shrink-0" style={{ color: MUTED }}>$</span>
            <Input
              type="number"
              min={0}
              value={item.amount}
              onChange={e => onChange(item.id, "amount", e.target.value)}
              className="flex-1 h-auto text-sm text-right border-0 bg-transparent text-white placeholder:text-white/20 focus-visible:ring-0 px-0 py-0"
              placeholder="0"
              data-testid={`input-amount-${item.id}`}
            />
          </div>
        </div>
      </div>

      {/* Row 3: Notes */}
      <div className="px-4 py-2.5">
        {!notesOpen && !item.notes ? (
          <button
            className="text-xs transition-colors hover:text-white/60"
            style={{ color: DIM }}
            onClick={() => setNotesOpen(true)}
          >
            + Add note
          </button>
        ) : (
          <Input
            value={item.notes}
            onChange={e => onChange(item.id, "notes", e.target.value)}
            className="h-auto w-full text-sm border-0 bg-transparent text-white placeholder:text-white/20 focus-visible:ring-0 px-0 py-0"
            placeholder="Optional note…"
            data-testid={`input-notes-${item.id}`}
          />
        )}
      </div>
    </div>
  );
}

export default function NetWorth() {
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [showSignupGate, setShowSignupGate] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [step, setStep] = useState<"upload" | "review" | "builder">("upload");
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [reviewItems, setReviewItems] = useState<LineItem[]>([]);
  const [allItems, setAllItems] = useState<LineItem[]>([]);

  const isPro = user?.subscriptionStatus === "active" || user?.subscriptionStatus === "trialing";

  const assets  = allItems.filter(i => i.itemType === "asset");
  const debts   = allItems.filter(i => i.itemType === "liability");
  const totalAssets = assets.reduce((s, i) => s + (parseFloat(i.amount) || 0), 0);
  const totalDebts  = debts.reduce((s, i) => s + (parseFloat(i.amount) || 0), 0);
  const netWorth    = totalAssets - totalDebts;

  const MAX_SIZE = 20 * 1024 * 1024; // 20MB
  const ACCEPTED = [".pdf", ".jpg", ".jpeg", ".png", ".csv", ".xlsx"];

  function updateUploadedFile(id: string, patch: Partial<UploadedFile>) {
    setUploadedFiles(prev => prev.map(f => f.id === id ? { ...f, ...patch } : f));
  }

  async function processFile(file: File) {
    const ext = "." + file.name.split(".").pop()?.toLowerCase();
    if (!ACCEPTED.includes(ext)) {
      toast({ title: "Unsupported file type", description: `Accepted: PDF, JPG, PNG, CSV, XLSX`, variant: "destructive" });
      return;
    }
    if (file.size > MAX_SIZE) {
      toast({ title: "File too large", description: "Maximum file size is 20 MB.", variant: "destructive" });
      return;
    }

    const fileEntry: UploadedFile = {
      id: makeId(), name: file.name, size: file.size,
      type: ext, status: "uploading", items: [],
    };
    setUploadedFiles(prev => [...prev, fileEntry]);

    const tick = (status: UploadedFile["status"], delay: number) =>
      new Promise<void>(res => setTimeout(() => { updateUploadedFile(fileEntry.id, { status }); res(); }, delay));

    await tick("reading", 600);
    await tick("extracting", 900);

    if (ext === ".csv") {
      const text = await file.text();
      const items = parseCSVText(text, file.name);
      if (items.length === 0) {
        updateUploadedFile(fileEntry.id, { status: "needs-review", error: "Could not detect columns. Expected: Description, Amount (and optionally Type)." });
      } else {
        updateUploadedFile(fileEntry.id, { status: "ready", items });
      }
    } else if (ext === ".xlsx") {
      const buf = await file.arrayBuffer();
      const items = parseXLSXBuffer(buf, file.name);
      if (items.length === 0) {
        updateUploadedFile(fileEntry.id, { status: "needs-review", error: "Could not detect columns. Check that your spreadsheet has Description and Amount columns." });
      } else {
        updateUploadedFile(fileEntry.id, { status: "ready", items });
      }
    } else {
      // PDF / image — route to manual review
      await new Promise(res => setTimeout(res, 800));
      updateUploadedFile(fileEntry.id, {
        status: "needs-review",
        error: "PDF and image files can't be parsed automatically. Please enter your figures using the builder below.",
      });
    }
  }

  function handleFiles(fileList: FileList | null) {
    if (!fileList) return;
    if (!user) { setShowSignupGate(true); return; }
    Array.from(fileList).forEach(f => processFile(f));
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    handleFiles(e.dataTransfer.files);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFiles(e.target.files);
    e.target.value = "";
  };

  const readyItems = uploadedFiles.flatMap(f => f.items);
  const hasReadyFiles = uploadedFiles.some(f => f.status === "ready");

  function goToReview() {
    setReviewItems(readyItems.map(i => ({ ...i })));
    setStep("review");
  }

  function confirmReview() {
    const newItems = reviewItems.map(i => ({ ...i }));
    setAllItems(prev => [...prev, ...newItems]);
    setReviewItems([]);
    setUploadedFiles([]);
    setStep("builder");
    const na = newItems.filter(i => i.itemType === "asset").length;
    const nd = newItems.filter(i => i.itemType === "liability").length;
    toast({ title: `${na} asset${na !== 1 ? "s" : ""} and ${nd} liabilit${nd !== 1 ? "ies" : "y"} added.` });
  }

  function updateReviewItem(id: string, field: keyof LineItem, v: string) {
    setReviewItems(prev => prev.map(i => i.id === id ? { ...i, [field]: v } : i));
  }

  function deleteReviewItem(id: string) {
    setReviewItems(prev => prev.filter(i => i.id !== id));
  }

  function flipReviewType(id: string) {
    setReviewItems(prev => prev.map(i => i.id === id ? { ...i, itemType: i.itemType === "asset" ? "liability" : "asset" } : i));
  }

  function updateItem(id: string, field: keyof LineItem, v: string) {
    setAllItems(prev => prev.map(i => i.id === id ? { ...i, [field]: v } : i));
  }

  function flipItemType(id: string) {
    setAllItems(prev => prev.map(i =>
      i.id === id ? { ...i, itemType: i.itemType === "asset" ? "liability" : "asset" } : i
    ));
  }

  function addItem(itemType: ItemType) {
    setAllItems(prev => [...prev, { id: makeId(), label: "", amount: "", category: "", itemType, notes: "", needsReview: false }]);
  }

  function deleteItem(id: string) {
    setAllItems(prev => prev.filter(i => i.id !== id));
  }

  function recalculate() {
    // Force a re-render to recompute derived totals; show confirmation
    setAllItems(prev => [...prev]);
    toast({ title: "Net worth recalculated", description: `Assets ${fmt(totalAssets)} − Liabilities ${fmt(totalDebts)} = ${fmt(netWorth)}` });
  }

  const saveStatement = useMutation({
    mutationFn: () => apiRequest("POST", "/api/net-worth", {
      title: `Net Worth Statement — ${new Date().toLocaleDateString("en-CA")}`,
      assets: assets.map(a => ({ label: a.label, amount: parseFloat(a.amount) || 0, category: "asset" })),
      liabilities: debts.map(d => ({ label: d.label, amount: parseFloat(d.amount) || 0, category: "liability" })),
      totalAssets: Math.round(totalAssets),
      totalLiabilities: Math.round(totalDebts),
      netWorth: Math.round(netWorth),
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/net-worth"] });
      toast({ title: "Statement saved!" });
    },
    onError: () => toast({ title: "Could not save", variant: "destructive" }),
  });

  const [, setLocation] = useLocation();

  const handleSave = () => {
    if (!user) { setShowSignupGate(true); return; }
    if (!isPro) { setShowUpgradeModal(true); return; }
    saveStatement.mutate();
  };

  const handleDownload = () => {
    if (!user) { setShowSignupGate(true); return; }
    if (!isPro) { setShowUpgradeModal(true); return; }
    window.print();
  };

  return (
    <AppLayout>
      <style>{`
        @media print {
          nav, header, .no-print { display: none !important; }
          body { background: white !important; color: black !important; }
        }
      `}</style>


        {/* Sign-up gate — anonymous users */}
        <SignupGateModal
          open={showSignupGate}
          onClose={() => setShowSignupGate(false)}
          title="Create a Free Account to Upload"
          description="Sign up to upload your documents and build your net worth statement."
        />

        {/* Upgrade modal — free logged-in users hitting Save / Download */}
        <NetWorthUpgradeModal
          open={showUpgradeModal}
          onClose={() => setShowUpgradeModal(false)}
        />

        <div className="container mx-auto px-4 py-10 max-w-5xl">

          {/* Header */}
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border mb-4 text-xs font-semibold" style={{ background: "rgba(197,163,90,0.08)", borderColor: GOLD_BORDER, color: GOLD }}>
              Net Worth Builder
            </div>
            <h1 className="text-2xl sm:text-4xl font-bold text-white mb-3">What You Own and What You Owe</h1>
            <p className="text-base max-w-2xl mx-auto" style={{ color: MUTED }}>
              Upload your financial documents or enter your numbers manually. adavi.ai will help organize everything into a simple net worth statement.
            </p>
          </div>

          {/* Step indicator */}
          <div className="flex items-center justify-center gap-2 sm:gap-4 mb-10 no-print">
            {[
              { key: "upload", label: "1. Upload" },
              { key: "review", label: "2. Review" },
              { key: "builder", label: "3. Net Worth" },
            ].map((s, i, arr) => (
              <div key={s.key} className="flex items-center gap-2 sm:gap-4">
                <span className="text-xs sm:text-sm font-semibold"
                  style={{ color: step === s.key ? GOLD : DIM }}>
                  {s.label}
                </span>
                {i < arr.length - 1 && <ChevronRight className="w-3 h-3 sm:w-4 sm:h-4" style={{ color: DIM }} />}
              </div>
            ))}
          </div>

          {/* ────────────────── STEP 1: UPLOAD ────────────────── */}
          {step === "upload" && (
            <>
              {/* Drop zone */}
              <div
                className="rounded-2xl border-2 border-dashed px-5 py-7 sm:p-10 flex flex-col items-center gap-4 cursor-pointer transition-all mb-4 no-print"
                style={{ background: dragging ? "rgba(197,163,90,0.06)" : "rgba(255,255,255,0.02)", borderColor: dragging ? GOLD : GOLD_BORDER }}
                onDragOver={e => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                data-testid="upload-zone"
              >
                <div className="w-14 h-14 rounded-xl flex items-center justify-center" style={{ background: "rgba(197,163,90,0.12)" }}>
                  <Upload className="w-7 h-7" style={{ color: GOLD }} />
                </div>
                <div className="text-center">
                  <p className="text-base sm:text-lg font-bold text-white mb-1">Drag & drop your documents here, or click to browse</p>
                  <p className="text-xs sm:text-sm" style={{ color: DIM }}>Bank statements · Investment statements · Mortgage statements · Credit card statements · Corporate financials</p>
                </div>
                <div className="flex gap-3 flex-wrap justify-center">
                  {["PDF", "JPG", "PNG", "CSV", "XLSX"].map(t => (
                    <span key={t} className="text-xs font-semibold px-2.5 py-1 rounded-full border" style={{ borderColor: GOLD_BORDER, color: MUTED }}>
                      {t}
                    </span>
                  ))}
                </div>
                <p className="text-xs" style={{ color: DIM }}>You can upload multiple documents at once · Max 20 MB per file</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept=".pdf,.jpg,.jpeg,.png,.csv,.xlsx"
                  className="hidden"
                  onChange={handleFileChange}
                  data-testid="input-file-upload"
                />
              </div>

              {/* Uploaded files list */}
              {uploadedFiles.length > 0 && (
                <div className="rounded-2xl border p-5 mb-6" style={{ background: CARD, borderColor: BORDER }}>
                  <p className="text-sm font-semibold text-white mb-4">Uploaded Documents</p>
                  <div className="space-y-3">
                    {uploadedFiles.map(f => (
                      <div key={f.id} className="flex items-center gap-3 text-sm">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: "rgba(197,163,90,0.1)" }}>
                          {[".jpg", ".jpeg", ".png"].includes(f.type) ? <Image className="w-4 h-4" style={{ color: GOLD }} /> : <FileText className="w-4 h-4" style={{ color: GOLD }} />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-white font-medium truncate">{f.name}</p>
                          <p className="text-xs" style={{ color: DIM }}>{fmtSize(f.size)}</p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-xs font-semibold" style={{ color: STATUS_COLORS[f.status] }}>
                            {f.status === "ready" && <Check className="w-3.5 h-3.5 inline mr-1" />}
                            {STATUSES[f.status]}
                          </p>
                          {f.items.length > 0 && (
                            <p className="text-xs" style={{ color: DIM }}>{f.items.length} items found</p>
                          )}
                        </div>
                        <button onClick={() => setUploadedFiles(prev => prev.filter(x => x.id !== f.id))} className="ml-2 shrink-0 text-white/30 hover:text-white/70">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>

                  {uploadedFiles.some(f => f.error) && (
                    <div className="mt-4 space-y-2">
                      {uploadedFiles.filter(f => f.error).map(f => (
                        <div key={f.id} className="flex items-start gap-2 rounded-lg p-3" style={{ background: "rgba(197,163,90,0.06)", borderColor: GOLD_BORDER, border: `1px solid ${GOLD_BORDER}` }}>
                          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" style={{ color: GOLD }} />
                          <div>
                            <p className="text-xs font-semibold text-white">{f.name}</p>
                            <p className="text-xs mt-0.5" style={{ color: MUTED }}>{f.error}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* CTA to review or skip to builder */}
              <div className="flex flex-wrap gap-3 mb-10 no-print">
                {hasReadyFiles && (
                  <Button onClick={goToReview} className="font-bold" style={{ background: GOLD, color: BG }} data-testid="button-go-review">
                    <Eye className="w-4 h-4 mr-1.5" />
                    Review {readyItems.length} Extracted Item{readyItems.length !== 1 ? "s" : ""}
                    <ChevronRight className="w-4 h-4 ml-1.5" />
                  </Button>
                )}
                <Button
                  variant="outline"
                  onClick={() => setStep("builder")}
                  className="border text-white/70 hover:text-white hover:bg-white/5"
                  style={{ borderColor: BORDER }}
                  data-testid="button-skip-to-builder"
                >
                  {uploadedFiles.length === 0 ? "Enter Numbers Manually" : "Skip to Manual Entry"}
                  <ArrowRight className="w-4 h-4 ml-1.5" />
                </Button>
              </div>
            </>
          )}

          {/* ────────────────── STEP 2: REVIEW ────────────────── */}
          {step === "review" && (
            <div className="mb-10">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-white mb-1">Review What We Found</h2>
                  <p className="text-sm" style={{ color: MUTED }}>We organized your documents into what you own and what you owe. Review and correct anything that doesn't look right before we calculate your net worth.</p>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setStep("upload")} className="text-white/50 hover:text-white shrink-0">
                  <ChevronLeft className="w-4 h-4 mr-1" />Back
                </Button>
              </div>

              <div className="rounded-2xl border overflow-hidden mb-6" style={{ background: CARD, borderColor: BORDER }}>
                {/* Table header — desktop only */}
                <div className="hidden sm:grid grid-cols-12 gap-3 px-4 py-2.5 text-xs font-bold uppercase tracking-widest border-b" style={{ color: DIM, borderColor: BORDER }}>
                  <div className="col-span-4">Item Name</div>
                  <div className="col-span-3">Type</div>
                  <div className="col-span-3 text-right">Amount</div>
                  <div className="col-span-2 text-right">Actions</div>
                </div>
                {reviewItems.length === 0 && (
                  <div className="px-4 py-8 text-center text-sm" style={{ color: DIM }}>No items to review.</div>
                )}
                {reviewItems.map(item => (
                  <div key={item.id} className="px-4 py-3 border-b last:border-b-0" style={{ borderColor: BORDER }}>
                    {/* Mobile card layout */}
                    <div className="flex items-start gap-2 sm:hidden">
                      <div className="flex-1 min-w-0">
                        <Input
                          value={item.label}
                          onChange={e => updateReviewItem(item.id, "label", e.target.value)}
                          className="h-8 text-sm border-0 bg-transparent text-white focus-visible:ring-0 px-0 placeholder:text-white/25 w-full"
                          placeholder="Item name"
                        />
                        {item.source && <p className="text-xs mt-0.5 truncate" style={{ color: DIM }}>{item.source}</p>}
                        <div className="flex items-center gap-2 mt-2">
                          <button
                            onClick={() => flipReviewType(item.id)}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border transition-colors"
                            style={{
                              background: item.itemType === "asset" ? "rgba(74,222,128,0.1)" : "rgba(248,113,113,0.1)",
                              borderColor: item.itemType === "asset" ? "rgba(74,222,128,0.3)" : "rgba(248,113,113,0.3)",
                              color: item.itemType === "asset" ? "#4ADE80" : "#F87171",
                            }}
                            data-testid={`button-flip-type-${item.id}`}
                          >
                            {item.itemType === "asset" ? "Asset" : "Liability"}
                            <Edit2 className="w-2.5 h-2.5" />
                          </button>
                          <div className="flex items-center gap-1 ml-auto">
                            <span className="text-sm" style={{ color: MUTED }}>$</span>
                            <Input
                              type="number"
                              value={item.amount}
                              onChange={e => updateReviewItem(item.id, "amount", e.target.value)}
                              className="w-24 h-8 text-sm text-right border-0 bg-transparent text-white focus-visible:ring-0 px-0"
                              placeholder="0"
                            />
                          </div>
                        </div>
                      </div>
                      <button onClick={() => deleteReviewItem(item.id)} className="shrink-0 mt-1 text-red-400/40 hover:text-red-400 transition-colors">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    {/* Desktop table row */}
                    <div className="hidden sm:grid grid-cols-12 gap-3 items-center">
                      <div className="col-span-4">
                        <Input
                          value={item.label}
                          onChange={e => updateReviewItem(item.id, "label", e.target.value)}
                          className="h-8 text-sm border-0 bg-transparent text-white focus-visible:ring-0 px-0 placeholder:text-white/25"
                          placeholder="Item name"
                        />
                        {item.source && <p className="text-xs mt-0.5 truncate" style={{ color: DIM }}>{item.source}</p>}
                      </div>
                      <div className="col-span-3">
                        <button
                          onClick={() => flipReviewType(item.id)}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border transition-colors"
                          style={{
                            background: item.itemType === "asset" ? "rgba(74,222,128,0.1)" : "rgba(248,113,113,0.1)",
                            borderColor: item.itemType === "asset" ? "rgba(74,222,128,0.3)" : "rgba(248,113,113,0.3)",
                            color: item.itemType === "asset" ? "#4ADE80" : "#F87171",
                          }}
                          data-testid={`button-flip-type-${item.id}`}
                        >
                          {item.itemType === "asset" ? "Asset" : "Liability"}
                          <Edit2 className="w-2.5 h-2.5" />
                        </button>
                      </div>
                      <div className="col-span-3 flex items-center justify-end gap-1">
                        <span className="text-sm" style={{ color: MUTED }}>$</span>
                        <Input
                          type="number"
                          value={item.amount}
                          onChange={e => updateReviewItem(item.id, "amount", e.target.value)}
                          className="w-24 h-8 text-sm text-right border-0 bg-transparent text-white focus-visible:ring-0 px-0"
                          placeholder="0"
                        />
                      </div>
                      <div className="col-span-2 flex justify-end gap-2">
                        <button onClick={() => deleteReviewItem(item.id)} className="text-red-400/40 hover:text-red-400 transition-colors">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex gap-3">
                <Button onClick={confirmReview} className="font-bold" style={{ background: GOLD, color: BG }} data-testid="button-confirm-review">
                  <Check className="w-4 h-4 mr-1.5" />
                  Add {reviewItems.length} Items to Net Worth
                </Button>
                <Button variant="outline" onClick={() => setStep("upload")} className="border text-white/70 hover:text-white hover:bg-white/5" style={{ borderColor: BORDER }}>
                  <ChevronLeft className="w-4 h-4 mr-1" />Back to Upload
                </Button>
              </div>
            </div>
          )}

          {/* ────────────────── STEP 3: BUILDER ────────────────── */}
          {step === "builder" && (
            <>
              {/* Premium Summary Cards */}
              <div className="grid md:grid-cols-3 gap-4 mb-8 items-stretch">

                {/* What You Own */}
                <div
                  className="rounded-2xl border p-6 flex flex-col"
                  style={{ background: "rgba(74,222,128,0.04)", borderColor: "rgba(74,222,128,0.18)" }}
                  data-testid="stat-what-you-own"
                >
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0" style={{ background: "rgba(74,222,128,0.12)" }}>
                      <ArrowUpCircle className="w-4 h-4" style={{ color: GREEN }} />
                    </div>
                    <p className="text-xs font-bold uppercase tracking-widest" style={{ color: GREEN }}>What You Own</p>
                  </div>
                  <p className="text-4xl font-extrabold tracking-tight text-white mb-1">{fmt(totalAssets)}</p>
                  <p className="text-xs mt-auto pt-3" style={{ color: DIM }}>Cash · Investments · Real Estate · Business</p>
                  <div className="mt-3 h-0.5 rounded-full" style={{ background: "rgba(74,222,128,0.15)" }} />
                  <p className="text-xs font-semibold mt-2" style={{ color: GREEN }}>
                    {assets.length} asset{assets.length !== 1 ? "s" : ""}
                  </p>
                </div>

                {/* Your Net Worth — dominant center card */}
                <div
                  className="rounded-2xl border-2 p-6 flex flex-col relative overflow-hidden"
                  style={{
                    background: "white",
                    borderColor: GOLD,
                    boxShadow: "0 0 0 1px rgba(197,163,90,0.15), 0 8px 40px rgba(197,163,90,0.28), 0 0 80px rgba(197,163,90,0.12)",
                  }}
                  data-testid="stat-your-net-worth"
                >
                  {/* Subtle gold radial glow behind content */}
                  <div className="absolute inset-0 pointer-events-none" style={{
                    background: "radial-gradient(ellipse at 50% 0%, rgba(197,163,90,0.08) 0%, transparent 70%)"
                  }} />
                  <div className="relative z-10 flex flex-col h-full">
                    <div className="flex items-center gap-2 mb-4">
                      <Crown className="w-5 h-5" style={{ color: GOLD }} />
                      <p className="text-xs font-bold uppercase tracking-widest" style={{ color: GOLD }}>Your Net Worth</p>
                    </div>
                    <p
                      className="text-5xl font-extrabold tracking-tight mb-1"
                      style={{ color: netWorth >= 0 ? "#1a1f2e" : "#c0392b" }}
                    >
                      {netWorth < 0 ? "-" : ""}{fmt(Math.abs(netWorth))}
                    </p>
                    <p className="text-xs mt-auto pt-3" style={{ color: "#8a8070" }}>Total Assets − Total Liabilities</p>
                    <div className="mt-3 h-0.5 rounded-full" style={{ background: "rgba(197,163,90,0.3)" }} />
                    <p className="text-xs font-semibold mt-2" style={{ color: GOLD }}>
                      {allItems.length} item{allItems.length !== 1 ? "s" : ""} tracked
                    </p>
                  </div>
                </div>

                {/* What You Owe */}
                <div
                  className="rounded-2xl border p-6 flex flex-col"
                  style={{ background: "rgba(248,113,113,0.04)", borderColor: "rgba(248,113,113,0.18)" }}
                  data-testid="stat-what-you-owe"
                >
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0" style={{ background: "rgba(248,113,113,0.12)" }}>
                      <ArrowDownCircle className="w-4 h-4" style={{ color: RED }} />
                    </div>
                    <p className="text-xs font-bold uppercase tracking-widest" style={{ color: RED }}>What You Owe</p>
                  </div>
                  <p className="text-4xl font-extrabold tracking-tight text-white mb-1">{fmt(totalDebts)}</p>
                  <p className="text-xs mt-auto pt-3" style={{ color: DIM }}>Mortgage · Loans · Credit Cards · Taxes</p>
                  <div className="mt-3 h-0.5 rounded-full" style={{ background: "rgba(248,113,113,0.15)" }} />
                  <p className="text-xs font-semibold mt-2" style={{ color: RED }}>
                    {debts.length} liabilit{debts.length !== 1 ? "ies" : "y"}
                  </p>
                </div>
              </div>

              {/* Primary action buttons row */}
              <div className="flex flex-wrap gap-3 mb-8 no-print">
                <Button
                  onClick={() => addItem("asset")}
                  className="font-bold gap-2"
                  style={{ background: "rgba(74,222,128,0.12)", color: GREEN, border: `1px solid rgba(74,222,128,0.3)` }}
                  data-testid="button-add-asset"
                >
                  <ArrowUpCircle className="w-4 h-4" />
                  Add Asset
                </Button>
                <Button
                  onClick={() => addItem("liability")}
                  className="font-bold gap-2"
                  style={{ background: "rgba(248,113,113,0.12)", color: RED, border: `1px solid rgba(248,113,113,0.3)` }}
                  data-testid="button-add-debt"
                >
                  <ArrowDownCircle className="w-4 h-4" />
                  Add Debt
                </Button>
                <Button
                  onClick={recalculate}
                  variant="outline"
                  className="gap-2 border text-white/70 hover:text-white hover:bg-white/5"
                  style={{ borderColor: BORDER }}
                  data-testid="button-recalculate"
                >
                  <RefreshCw className="w-4 h-4" />
                  Recalculate
                </Button>
              </div>

              {/* Assets section */}
              <div className="mb-8">
                <div className="flex items-center gap-3 mb-4">
                  <ArrowUpCircle className="w-5 h-5" style={{ color: GREEN }} />
                  <h2 className="text-lg font-bold text-white">Assets</h2>
                  <span className="text-sm font-semibold ml-auto" style={{ color: GREEN }}>{fmt(totalAssets)}</span>
                  <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full" style={{ background: "rgba(74,222,128,0.1)", color: GREEN }}>
                    {assets.length} item{assets.length !== 1 ? "s" : ""}
                  </span>
                </div>

                {assets.length === 0 ? (
                  <div
                    className="rounded-xl border-2 border-dashed flex flex-col items-center justify-center py-10 mb-3 cursor-pointer transition-colors hover:border-green-400/40"
                    style={{ borderColor: "rgba(74,222,128,0.2)" }}
                    onClick={() => addItem("asset")}
                    data-testid="empty-assets-zone"
                  >
                    <ArrowUpCircle className="w-8 h-8 mb-3 opacity-30" style={{ color: GREEN }} />
                    <p className="text-sm font-semibold text-white/40">No assets added yet</p>
                    <p className="text-xs mt-1" style={{ color: DIM }}>Click to add your first asset</p>
                  </div>
                ) : (
                  assets.map(item => (
                    <ManualItemCard
                      key={item.id}
                      item={item}
                      onChange={updateItem}
                      onDelete={deleteItem}
                      onFlipType={flipItemType}
                    />
                  ))
                )}

                <Button
                  onClick={() => addItem("asset")}
                  variant="outline"
                  size="sm"
                  className="gap-2 font-semibold"
                  style={{ borderColor: "rgba(74,222,128,0.3)", color: GREEN, background: "rgba(74,222,128,0.06)" }}
                  data-testid="button-add-asset-inline"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Asset
                </Button>
              </div>

              {/* Liabilities section */}
              <div className="mb-8">
                <div className="flex items-center gap-3 mb-4">
                  <ArrowDownCircle className="w-5 h-5" style={{ color: RED }} />
                  <h2 className="text-lg font-bold text-white">Liabilities</h2>
                  <span className="text-sm font-semibold ml-auto" style={{ color: RED }}>{fmt(totalDebts)}</span>
                  <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full" style={{ background: "rgba(248,113,113,0.1)", color: RED }}>
                    {debts.length} item{debts.length !== 1 ? "s" : ""}
                  </span>
                </div>

                {debts.length === 0 ? (
                  <div
                    className="rounded-xl border-2 border-dashed flex flex-col items-center justify-center py-10 mb-3 cursor-pointer transition-colors hover:border-red-400/40"
                    style={{ borderColor: "rgba(248,113,113,0.2)" }}
                    onClick={() => addItem("liability")}
                    data-testid="empty-debts-zone"
                  >
                    <ArrowDownCircle className="w-8 h-8 mb-3 opacity-30" style={{ color: RED }} />
                    <p className="text-sm font-semibold text-white/40">No liabilities added yet</p>
                    <p className="text-xs mt-1" style={{ color: DIM }}>Click to add your first debt</p>
                  </div>
                ) : (
                  debts.map(item => (
                    <ManualItemCard
                      key={item.id}
                      item={item}
                      onChange={updateItem}
                      onDelete={deleteItem}
                      onFlipType={flipItemType}
                    />
                  ))
                )}

                <Button
                  onClick={() => addItem("liability")}
                  variant="outline"
                  size="sm"
                  className="gap-2 font-semibold"
                  style={{ borderColor: "rgba(248,113,113,0.3)", color: RED, background: "rgba(248,113,113,0.06)" }}
                  data-testid="button-add-debt-inline"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Debt
                </Button>
              </div>

              {/* Secondary action buttons */}
              <div className="flex flex-wrap gap-3 no-print mb-2">
                <Button variant="outline" className="border text-white/70 hover:text-white hover:bg-white/5" style={{ borderColor: BORDER }} onClick={() => setStep("upload")} data-testid="button-back-upload">
                  <ChevronLeft className="w-4 h-4 mr-1" />Upload More
                </Button>
                <Button
                  onClick={recalculate}
                  variant="outline"
                  className="border text-white/70 hover:text-white hover:bg-white/5 gap-2"
                  style={{ borderColor: BORDER }}
                  data-testid="button-recalculate-bottom"
                >
                  <RefreshCw className="w-4 h-4" />Recalculate
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={saveStatement.isPending}
                  className="font-semibold"
                  style={{
                    background: isPro ? "rgba(255,255,255,0.07)" : "rgba(197,163,90,0.08)",
                    color: isPro ? "white" : GOLD,
                    border: `1px solid ${isPro ? BORDER : GOLD_BORDER}`,
                  }}
                  data-testid="button-save-net-worth"
                >
                  {!isPro ? <Lock className="w-4 h-4 mr-1.5" /> : <Save className="w-4 h-4 mr-1.5" />}
                  {saveStatement.isPending ? "Saving…" : isPro ? "Save Statement" : "Save (Premium)"}
                </Button>
                <Button
                  onClick={handleDownload}
                  className="font-semibold"
                  style={{ background: isPro ? GOLD : "rgba(197,163,90,0.12)", color: isPro ? BG : GOLD }}
                  data-testid="button-download-pdf"
                >
                  {!isPro ? <Lock className="w-4 h-4 mr-1.5" /> : <Download className="w-4 h-4 mr-1.5" />}
                  Download PDF
                </Button>
              </div>

              {!isPro && (
                <div className="rounded-2xl border p-5 mt-4 no-print" style={{ background: "rgba(197,163,90,0.06)", borderColor: GOLD_BORDER }}>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <Crown className="w-6 h-6 shrink-0" style={{ color: GOLD }} />
                      <p className="text-sm text-white">Upgrade to Premium to save and download professional PDF reports for your accountant.</p>
                    </div>
                    <Link href="/pricing">
                      <Button size="sm" className="font-bold whitespace-nowrap" style={{ background: GOLD, color: BG }} data-testid="button-upgrade-net-worth">
                        Upgrade — $8.99/mo
                      </Button>
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
