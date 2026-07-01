import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ChevronLeft, AlertTriangle, CheckCircle2, Trash2,
  ArrowUpCircle, ArrowDownCircle, CheckCheck, Loader2,
  FileSpreadsheet, ScanLine, Info, FileText, Star,
  MessageSquare, X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { AppLayout } from "@/components/layout/AppLayout";
import { DS } from "@/lib/design";
import { useToast } from "@/hooks/use-toast";

// ── Types ─────────────────────────────────────────────────────────────────────

type ItemType = "asset" | "liability";

interface ParsedItem {
  tempId: string;
  name: string;
  category: string;
  type: ItemType;
  amount: number;
  notes: string;
  needsReview: boolean;
  reviewReason?: string;
  confidenceScore?: number;
  sourceTextSnippet?: string;
}

interface ParseResult {
  documentId: number;
  originalName: string;
  headers?: string[];
  items: ParsedItem[];
  warnings: string[];
  totalRows: number;
  skippedRows: number;
  imageOnly?: boolean;
  pageCount?: number;
  ocrUsed?: boolean;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const AMBER        = "#FBBF24";
const AMBER_DIM    = "#FDE68A";
const AMBER_BG     = "rgba(251,191,36,0.06)";
const AMBER_BORDER = "rgba(251,191,36,0.4)";

const CATEGORIES = [
  "Bank Accounts", "Cash", "Savings",
  "RRSP", "TFSA", "FHSA", "RESP", "RRIF", "LIRA", "GIC",
  "Investments", "Stocks", "ETFs", "Mutual Funds", "Bonds",
  "Cryptocurrency", "Precious Metals",
  "Pension & Retirement",
  "Real Estate", "Investment Property", "Vehicles",
  "Business Ownership", "Corporation Shares",
  "Mortgage Investment", "Private Lending",
  "Receivables",
  "Mortgage Debt", "Credit Cards",
  "Car Loan", "Student Loans", "Business Loan",
  "Loans & Lines of Credit", "Taxes Owing",
  "Other",
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(n: number): string {
  return "$" + Math.abs(n).toLocaleString("en-CA", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function confidenceLabel(score?: number): { label: string; color: string; bg: string; pct: number } {
  if (score === undefined) return { label: "—", color: DS.DIM, bg: "transparent", pct: 0 };
  const pct = Math.round(score * 100);
  if (score >= 0.85) return { label: `${pct}% · High`,   color: DS.GREEN,  bg: "rgba(74,222,128,0.08)", pct };
  if (score >= 0.65) return { label: `${pct}% · Medium`, color: AMBER,     bg: AMBER_BG, pct };
  return                    { label: `${pct}% · Low`,    color: DS.RED,    bg: "rgba(248,113,113,0.08)", pct };
}

// ── Loading skeleton ──────────────────────────────────────────────────────────

function Skeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3].map(i => (
        <div key={i} className="rounded-2xl animate-pulse h-40"
          style={{ background: DS.CARD, opacity: 1 - i * 0.18 }} />
      ))}
    </div>
  );
}

// ── Item Card ─────────────────────────────────────────────────────────────────

function ItemCard({
  item,
  sourceDoc,
  onUpdate,
  onDelete,
  onFlipType,
  onClearFlag,
}: {
  item: ParsedItem;
  sourceDoc: string;
  onUpdate: (id: string, field: keyof ParsedItem, value: string | number) => void;
  onDelete: (id: string) => void;
  onFlipType: (id: string) => void;
  onClearFlag: (id: string) => void;
}) {
  const isAsset  = item.type === "asset";
  const flagged  = item.needsReview;
  const conf     = confidenceLabel(item.confidenceScore);
  const [notesOpen, setNotesOpen] = useState(!!item.notes);

  return (
    <div
      className="rounded-2xl border transition-all duration-200 overflow-hidden"
      style={{
        background:   flagged ? AMBER_BG : DS.CARD,
        borderColor:  flagged ? AMBER_BORDER : DS.BORDER,
        borderLeft:   flagged ? `4px solid ${AMBER}` : `4px solid transparent`,
      }}
      data-testid={`import-card-${item.tempId}`}
    >
      {/* ── Row 1: Name + Type + Delete ──────────────────────────────── */}
      <div className="flex items-start gap-3 px-4 pt-4 pb-2">
        {/* Name */}
        <div className="flex-1 min-w-0">
          <input
            className="w-full text-base font-semibold text-white bg-transparent border-0 outline-none placeholder:text-white/25"
            value={item.name}
            onChange={e => onUpdate(item.tempId, "name", e.target.value)}
            placeholder="Item name"
            data-testid={`input-name-${item.tempId}`}
          />
        </div>

        {/* Type toggle */}
        <button
          onClick={() => onFlipType(item.tempId)}
          className="flex items-center gap-1.5 text-xs font-bold rounded-xl px-3 py-1.5 shrink-0 transition-colors"
          style={{
            background: isAsset ? "rgba(74,222,128,0.12)" : "rgba(248,113,113,0.12)",
            color: isAsset ? DS.GREEN : DS.RED,
            border: flagged ? `1.5px solid ${AMBER_BORDER}` : "1.5px solid transparent",
          }}
          title={flagged ? "Click to confirm type and clear the review flag" : undefined}
          data-testid={`button-type-${item.tempId}`}
        >
          {isAsset
            ? <ArrowUpCircle className="w-3.5 h-3.5" />
            : <ArrowDownCircle className="w-3.5 h-3.5" />}
          {isAsset ? "Asset" : "Liability"}
        </button>

        {/* Delete */}
        <button
          onClick={() => onDelete(item.tempId)}
          className="flex items-center justify-center rounded-xl p-1.5 transition-colors hover:bg-red-500/10 group"
          data-testid={`button-remove-${item.tempId}`}
        >
          <Trash2 className="w-4 h-4 group-hover:text-red-400 transition-colors" style={{ color: DS.DIM }} />
        </button>
      </div>

      {/* ── Row 2: Category | Amount | Confidence ───────────────────── */}
      <div className="grid grid-cols-3 gap-3 px-4 pb-3" style={{ borderBottom: `1px solid ${DS.BORDER}` }}>
        {/* Category */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: DS.DIM }}>
            Category
          </label>
          <select
            className="w-full text-sm text-white bg-transparent border rounded-lg px-2 py-1.5 outline-none focus:border-white/30 transition-colors"
            style={{ borderColor: DS.BORDER, background: "rgba(255,255,255,0.03)" }}
            value={item.category}
            onChange={e => onUpdate(item.tempId, "category", e.target.value)}
            data-testid={`select-category-${item.tempId}`}
          >
            {CATEGORIES.map(c => (
              <option key={c} value={c} style={{ background: "#1e2535" }}>{c}</option>
            ))}
            {/* Keep the current value even if it's not in the list */}
            {item.category && !CATEGORIES.includes(item.category) && (
              <option value={item.category} style={{ background: "#1e2535" }}>{item.category}</option>
            )}
          </select>
        </div>

        {/* Amount */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: DS.DIM }}>
            Amount
          </label>
          <div className="flex items-center border rounded-lg px-2 py-1.5" style={{ borderColor: DS.BORDER, background: "rgba(255,255,255,0.03)" }}>
            <span className="text-sm mr-1" style={{ color: DS.MUTED }}>$</span>
            <input
              type="number"
              min={0}
              className="flex-1 text-sm text-right text-white bg-transparent border-0 outline-none"
              value={item.amount}
              onChange={e => onUpdate(item.tempId, "amount", parseFloat(e.target.value) || 0)}
              data-testid={`input-amount-${item.tempId}`}
            />
          </div>
        </div>

        {/* Confidence */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: DS.DIM }}>
            Confidence
          </label>
          <div
            className="flex items-center gap-2 rounded-lg px-2 py-1.5"
            style={{ background: conf.bg, border: `1px solid ${DS.BORDER}` }}
            data-testid={`confidence-${item.tempId}`}
          >
            {/* Bar */}
            <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.08)" }}>
              <div
                className="h-full rounded-full transition-all"
                style={{ width: `${conf.pct}%`, background: conf.color }}
              />
            </div>
            <span className="text-xs font-semibold whitespace-nowrap" style={{ color: conf.color }}>
              {conf.label}
            </span>
          </div>
        </div>
      </div>

      {/* ── Row 3: Notes ─────────────────────────────────────────────── */}
      <div className="px-4 py-2.5" style={{ borderBottom: `1px solid ${DS.BORDER}` }}>
        <div className="flex items-center gap-2 mb-1">
          <label className="text-xs font-semibold uppercase tracking-wider" style={{ color: DS.DIM }}>
            Notes
          </label>
          {!notesOpen && !item.notes && (
            <button
              className="text-xs transition-colors hover:text-white/60"
              style={{ color: DS.DIM }}
              onClick={() => setNotesOpen(true)}
            >
              + Add note
            </button>
          )}
        </div>
        {(notesOpen || item.notes) && (
          <input
            className="w-full text-sm text-white bg-transparent border-0 outline-none placeholder:text-white/20"
            value={item.notes}
            onChange={e => onUpdate(item.tempId, "notes", e.target.value)}
            placeholder="Optional note about this item…"
            data-testid={`input-notes-${item.tempId}`}
          />
        )}
      </div>

      {/* ── Row 4: Source + Needs Review ─────────────────────────────── */}
      <div className="flex flex-wrap items-start justify-between gap-2 px-4 py-2.5">
        {/* Source Document */}
        <div className="flex items-start gap-1.5 min-w-0 flex-1">
          <FileText className="w-3.5 h-3.5 shrink-0 mt-px" style={{ color: DS.DIM }} />
          <div className="min-w-0">
            <span className="text-xs font-medium truncate block" style={{ color: DS.MUTED }}>
              {sourceDoc}
            </span>
            {item.sourceTextSnippet && (
              <span
                className="text-xs italic truncate block max-w-xs"
                style={{ color: DS.DIM }}
                title={item.sourceTextSnippet}
              >
                "{item.sourceTextSnippet}"
              </span>
            )}
          </div>
        </div>

        {/* Needs Review badge — click to dismiss */}
        {flagged ? (
          <button
            className="flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold shrink-0 transition-colors hover:opacity-80"
            style={{ background: "rgba(251,191,36,0.15)", color: AMBER, border: `1px solid ${AMBER_BORDER}` }}
            onClick={() => onClearFlag(item.tempId)}
            title="Click to mark as reviewed"
            data-testid={`badge-review-${item.tempId}`}
          >
            <AlertTriangle className="w-3 h-3" />
            {item.reviewReason ?? "Needs Review"}
            <X className="w-3 h-3 opacity-60" />
          </button>
        ) : (
          <div
            className="flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold shrink-0"
            style={{ background: "rgba(74,222,128,0.08)", color: DS.GREEN, border: "1px solid rgba(74,222,128,0.2)" }}
            data-testid={`badge-ok-${item.tempId}`}
          >
            <CheckCircle2 className="w-3 h-3" />
            Verified
          </div>
        )}
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function CsvImportReview() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const qc = useQueryClient();

  const [items, setItems] = useState<ParsedItem[] | null>(null);

  // ── Annotation tracking ───────────────────────────────────────────────────
  // originalsRef holds the parser-extracted values before any user edits.
  // We compare against these to decide whether a change is worth recording.
  const originalsRef    = useRef<Map<string, ParsedItem>>(new Map());
  const debounceTimers  = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const { data, isLoading, isError, error } = useQuery<ParseResult>({
    queryKey: ["/api/documents", id, "parse"],
    queryFn: async () => {
      const res = await fetch(`/api/documents/${id}/parse`, { credentials: "include" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.message ?? `Could not read the file (${res.status})`);
      }
      return res.json();
    },
  });

  useEffect(() => {
    if (data && items === null) {
      setItems(data.items);
      // Snapshot originals once — never overwritten
      const snap = new Map<string, ParsedItem>();
      for (const item of data.items) snap.set(item.tempId, { ...item });
      originalsRef.current = snap;
    }
  }, [data]);

  const editableItems = items ?? [];

  const { assets, liabilities, flagged, totalAssets, totalLiabilities, avgConfidence } = useMemo(() => {
    const assets      = editableItems.filter(i => i.type === "asset");
    const liabilities = editableItems.filter(i => i.type === "liability");
    const flagged     = editableItems.filter(i => i.needsReview);
    const totalAssets = assets.reduce((s, i) => s + i.amount, 0);
    const totalLiabilities = liabilities.reduce((s, i) => s + i.amount, 0);
    const scores = editableItems.map(i => i.confidenceScore).filter((s): s is number => s !== undefined);
    const avgConfidence = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : undefined;
    return { assets, liabilities, flagged, totalAssets, totalLiabilities, avgConfidence };
  }, [editableItems]);

  // ── Annotation helpers ────────────────────────────────────────────────────

  /** POST an annotation record — fire and forget; silent on failure. */
  const fireAnnotation = useCallback((payload: {
    tempId: string;
    fieldName: string;
    originalValue: string;
    correctedValue: string;
    annotationType: string;
    notes?: string;
  }) => {
    const docId = data?.documentId;
    if (!docId) return;
    fetch("/api/annotations", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ documentId: docId, ...payload }),
    }).catch(() => {}); // non-critical — never blocks the user
  }, [data?.documentId]);

  /**
   * Debounced variant for free-text fields (name, notes).
   * Waits 800 ms of inactivity before firing so we don't spam on every keystroke.
   */
  const fireAnnotationDebounced = useCallback((key: string, payload: Parameters<typeof fireAnnotation>[0]) => {
    const existing = debounceTimers.current.get(key);
    if (existing) clearTimeout(existing);
    const timer = setTimeout(() => {
      fireAnnotation(payload);
      debounceTimers.current.delete(key);
    }, 800);
    debounceTimers.current.set(key, timer);
  }, [fireAnnotation]);

  // ── Mutators ──────────────────────────────────────────────────────────────

  const ANNOTATION_TYPE: Partial<Record<keyof ParsedItem, string>> = {
    name:     "name_correction",
    category: "category_correction",
    type:     "type_correction",
    amount:   "amount_correction",
    notes:    "notes_added",
  };

  function updateItem(tempId: string, field: keyof ParsedItem, value: string | number) {
    // 1. Update local state
    setItems(prev => (prev ?? []).map(i =>
      i.tempId === tempId ? { ...i, [field]: value } : i
    ));

    // 2. Record annotation when value differs from original
    const original = originalsRef.current.get(tempId);
    if (!original) return;
    const originalValue  = String((original as any)[field] ?? "");
    const correctedValue = String(value ?? "");
    if (originalValue === correctedValue) return;

    const annotationType = ANNOTATION_TYPE[field] ?? "field_correction";
    const payload = { tempId, fieldName: String(field), originalValue, correctedValue, annotationType };

    // Debounce free-text; fire immediately for selects / numbers
    if (field === "name" || field === "notes") {
      fireAnnotationDebounced(`${tempId}-${field}`, payload);
    } else {
      fireAnnotation(payload);
    }
  }

  function deleteItem(tempId: string) {
    setItems(prev => (prev ?? []).filter(i => i.tempId !== tempId));
  }

  /** Flip type = explicit confirmation → clear the review flag */
  function flipType(tempId: string) {
    const current = (items ?? []).find(i => i.tempId === tempId);
    const original = originalsRef.current.get(tempId);

    setItems(prev => (prev ?? []).map(i => {
      if (i.tempId !== tempId) return i;
      return { ...i, type: i.type === "asset" ? "liability" : "asset", needsReview: false, reviewReason: undefined };
    }));

    if (current && original) {
      const correctedValue = current.type === "asset" ? "liability" : "asset";
      fireAnnotation({
        tempId,
        fieldName: "type",
        originalValue: original.type,
        correctedValue,
        annotationType: "type_correction",
      });
      // If this also clears a flag, record that too
      if (current.needsReview) {
        fireAnnotation({
          tempId,
          fieldName: "needsReview",
          originalValue: "true",
          correctedValue: "false",
          annotationType: "flag_cleared",
          notes: current.reviewReason,
        });
      }
    }
  }

  /** Directly dismiss a flag without changing type */
  function clearFlag(tempId: string) {
    const current = (items ?? []).find(i => i.tempId === tempId);

    setItems(prev => (prev ?? []).map(i =>
      i.tempId === tempId ? { ...i, needsReview: false, reviewReason: undefined } : i
    ));

    if (current?.needsReview) {
      fireAnnotation({
        tempId,
        fieldName: "needsReview",
        originalValue: "true",
        correctedValue: "false",
        annotationType: "flag_cleared",
        notes: current.reviewReason,
      });
    }
  }

  // ── Import mutation ──
  const importMutation = useMutation({
    mutationFn: async () => {
      const payload = editableItems
        .filter(i => i.name.trim() && i.amount >= 0)
        .map(({ name, category, type, amount, notes }) => ({
          name: name.trim(),
          category: category || "Other",
          type,
          amount: Math.round(amount),
          notes: notes || "",
        }));

      if (payload.length === 0) throw new Error("No valid items to import.");

      const res = await fetch(`/api/documents/${id}/import`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: payload }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.message ?? "Import failed — please try again.");
      }
      return res.json();
    },
    onSuccess: (result) => {
      qc.invalidateQueries({ queryKey: ["/api/net-worth"] });
      qc.invalidateQueries({ queryKey: ["/api/documents"] });
      toast({
        title: `${result.importedCount} items added to your Net Worth`,
        description: `Net worth updated to ${fmt(result.netWorth)}.`,
      });
      setLocation("/net-worth");
    },
    onError: () => {
      toast({ title: "Import failed", description: "Something went wrong. Please try again.", variant: "destructive" });
    },
  });

  const sourceDoc = data?.originalName ?? "Document";
  const confInfo  = confidenceLabel(avgConfidence);

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <AppLayout>
      <div className="container mx-auto px-4 py-8 max-w-4xl">

        {/* Back + title */}
        <div className="mb-6">
          <button
            onClick={() => setLocation("/upload")}
            className="flex items-center gap-1.5 text-sm mb-4 transition-colors hover:text-white"
            style={{ color: DS.MUTED }}
            data-testid="button-back"
          >
            <ChevronLeft className="w-4 h-4" />
            Back to Documents
          </button>

          <div className="flex items-start gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 mt-0.5"
              style={{ background: "rgba(212,175,55,0.12)" }}
            >
              {data?.ocrUsed
                ? <ScanLine className="w-5 h-5" style={{ color: DS.GOLD }} />
                : <FileSpreadsheet className="w-5 h-5" style={{ color: DS.GOLD }} />}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Review What We Found</h1>
              {data && (
                <p className="text-sm mt-0.5" style={{ color: DS.MUTED }}>
                  {data.originalName}
                  {data.ocrUsed && " · OCR extracted"}
                  {!data.ocrUsed && data.pageCount != null
                    ? ` · ${data.pageCount} page${data.pageCount !== 1 ? "s" : ""}`
                    : !data.ocrUsed ? ` · ${data.totalRows} rows read` : ""}
                  {data.skippedRows > 0 && ` · ${data.skippedRows} skipped`}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* OCR banner */}
        {data?.ocrUsed && (
          <div
            className="rounded-xl border px-4 py-3 mb-4 flex items-start gap-2.5 text-sm"
            style={{ background: "rgba(96,165,250,0.07)", borderColor: "rgba(96,165,250,0.25)" }}
            data-testid="ocr-banner"
          >
            <ScanLine className="w-4 h-4 shrink-0 mt-0.5" style={{ color: DS.BLUE }} />
            <span style={{ color: "#BFDBFE" }}>
              <strong>Text extracted via OCR.</strong> Accuracy depends on image quality — review
              every line and correct any misread amounts before importing.
            </span>
          </div>
        )}

        {/* Warnings */}
        {data?.warnings && data.warnings.length > 0 && (
          <div
            className="rounded-xl border px-4 py-3 mb-4 space-y-1.5"
            style={{ background: "rgba(251,191,36,0.04)", borderColor: "rgba(251,191,36,0.2)" }}
            data-testid="import-warnings"
          >
            {data.warnings.map((w, i) => (
              <div key={i} className="flex items-start gap-2 text-sm">
                <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" style={{ color: AMBER }} />
                <span style={{ color: AMBER_DIM }}>{w}</span>
              </div>
            ))}
          </div>
        )}

        {/* Flagged callout */}
        {flagged.length > 0 && (
          <div
            className="rounded-xl border px-4 py-3.5 mb-5"
            style={{ background: AMBER_BG, borderColor: AMBER_BORDER }}
            data-testid="flagged-notice"
          >
            <div className="flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" style={{ color: AMBER }} />
              <div>
                <p className="text-sm font-semibold" style={{ color: AMBER }}>
                  {flagged.length} item{flagged.length !== 1 ? "s" : ""} need{flagged.length === 1 ? "s" : ""} your attention
                </p>
                <p className="text-xs mt-0.5 leading-relaxed" style={{ color: AMBER_DIM }}>
                  Items are flagged when the type was inferred, the amount is ambiguous, or AI
                  confidence is low. Each card shows the reason.{" "}
                  <strong>Tap the Asset / Liability button or ✕ on the flag to confirm and clear it.</strong>
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Loading */}
        {isLoading && <div className="mb-6"><Skeleton /></div>}

        {/* Error */}
        {isError && (
          <div
            className="rounded-xl border px-5 py-4 flex items-start gap-3 mb-6"
            style={{ background: "rgba(248,113,113,0.07)", borderColor: "rgba(248,113,113,0.25)" }}
            data-testid="parse-error"
          >
            <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" style={{ color: DS.RED }} />
            <div>
              <p className="font-semibold text-white mb-0.5">Couldn't read this file</p>
              <p className="text-sm" style={{ color: DS.MUTED }}>{(error as Error)?.message}</p>
            </div>
          </div>
        )}

        {/* ── Summary strip ───────────────────────────────────────────────── */}
        {editableItems.length > 0 && (
          <div className="grid grid-cols-5 gap-3 mb-6">
            {[
              { label: "Items",       value: String(editableItems.length),   color: DS.GOLD  },
              { label: "Assets",      value: fmt(totalAssets),                color: DS.GREEN },
              { label: "Liabilities", value: fmt(totalLiabilities),           color: DS.RED   },
              {
                label: "Flagged",
                value: flagged.length === 0 ? "✓" : String(flagged.length),
                color: flagged.length === 0 ? DS.GREEN : AMBER,
              },
              {
                label: "Avg Confidence",
                value: avgConfidence !== undefined ? `${Math.round(avgConfidence * 100)}%` : "—",
                color: confInfo.color,
              },
            ].map(({ label, value, color }) => (
              <div
                key={label}
                className="rounded-xl border p-3 text-center"
                style={{
                  background: DS.CARD,
                  borderColor: label === "Flagged" && flagged.length > 0 ? AMBER_BORDER : DS.BORDER,
                }}
              >
                <p className="text-xs mb-1" style={{ color: DS.MUTED }}>{label}</p>
                <p className="text-sm font-bold" style={{ color }}>{value}</p>
              </div>
            ))}
          </div>
        )}

        {/* ── Section: Needs Review ────────────────────────────────────────── */}
        {flagged.length > 0 && (
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="w-4 h-4" style={{ color: AMBER }} />
              <h2 className="text-sm font-bold uppercase tracking-wider" style={{ color: AMBER }}>
                Needs Review ({flagged.length})
              </h2>
            </div>
            <div className="space-y-3">
              {flagged.map(item => (
                <ItemCard
                  key={item.tempId}
                  item={item}
                  sourceDoc={sourceDoc}
                  onUpdate={updateItem}
                  onDelete={deleteItem}
                  onFlipType={flipType}
                  onClearFlag={clearFlag}
                />
              ))}
            </div>
          </div>
        )}

        {/* ── Section: Assets ─────────────────────────────────────────────── */}
        {assets.filter(i => !i.needsReview).length > 0 && (
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <ArrowUpCircle className="w-4 h-4" style={{ color: DS.GREEN }} />
              <h2 className="text-sm font-bold uppercase tracking-wider" style={{ color: DS.GREEN }}>
                Assets ({assets.filter(i => !i.needsReview).length})
              </h2>
            </div>
            <div className="space-y-3">
              {assets.filter(i => !i.needsReview).map(item => (
                <ItemCard
                  key={item.tempId}
                  item={item}
                  sourceDoc={sourceDoc}
                  onUpdate={updateItem}
                  onDelete={deleteItem}
                  onFlipType={flipType}
                  onClearFlag={clearFlag}
                />
              ))}
            </div>
          </div>
        )}

        {/* ── Section: Liabilities ─────────────────────────────────────────── */}
        {liabilities.filter(i => !i.needsReview).length > 0 && (
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <ArrowDownCircle className="w-4 h-4" style={{ color: DS.RED }} />
              <h2 className="text-sm font-bold uppercase tracking-wider" style={{ color: DS.RED }}>
                Liabilities ({liabilities.filter(i => !i.needsReview).length})
              </h2>
            </div>
            <div className="space-y-3">
              {liabilities.filter(i => !i.needsReview).map(item => (
                <ItemCard
                  key={item.tempId}
                  item={item}
                  sourceDoc={sourceDoc}
                  onUpdate={updateItem}
                  onDelete={deleteItem}
                  onFlipType={flipType}
                  onClearFlag={clearFlag}
                />
              ))}
            </div>
          </div>
        )}

        {/* No items found */}
        {!isLoading && !isError && data && editableItems.length === 0 && (
          <div
            className="rounded-2xl border p-10 text-center mb-6"
            style={{ background: DS.CARD, borderColor: DS.BORDER }}
            data-testid="no-items"
          >
            <p className="font-semibold text-white mb-2">We could not read this document clearly.</p>
            <p className="text-sm mb-6" style={{ color: DS.MUTED }}>You can still enter your numbers manually.</p>
            <Button
              onClick={() => setLocation("/net-worth")}
              className="font-semibold gap-2"
              style={{ background: DS.GOLD, color: "black" }}
              data-testid="button-manual-entry"
            >
              Continue to Manual Entry
            </Button>
          </div>
        )}

        {/* ── Action bar ─────────────────────────────────────────────────────── */}
        <div
          className="sticky bottom-0 rounded-2xl border flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 mt-2"
          style={{ background: "rgba(15,20,35,0.92)", borderColor: DS.BORDER, backdropFilter: "blur(12px)" }}
        >
          <div>
            <p className="text-sm font-medium text-white">
              {editableItems.length} item{editableItems.length !== 1 ? "s" : ""} ready to import
            </p>
            {flagged.length > 0 ? (
              <p className="text-xs mt-0.5 font-medium" style={{ color: AMBER }}>
                ⚠ {flagged.length} unflagged item{flagged.length !== 1 ? "s" : ""} — verify before importing
              </p>
            ) : editableItems.length > 0 ? (
              <p className="text-xs mt-0.5 flex items-center gap-1" style={{ color: DS.GREEN }}>
                <CheckCircle2 className="w-3 h-3" /> All items verified — ready to import
              </p>
            ) : null}
          </div>

          <div className="flex gap-2.5">
            <Button
              variant="outline"
              onClick={() => setLocation("/upload")}
              className="border hover:bg-white/5 text-white/70 hover:text-white"
              style={{ borderColor: DS.BORDER }}
              data-testid="button-cancel"
            >
              Cancel
            </Button>
            <Button
              onClick={() => importMutation.mutate()}
              disabled={editableItems.length === 0 || importMutation.isPending}
              className="font-bold gap-2"
              style={{
                background: flagged.length > 0 ? "rgba(251,191,36,0.85)" : DS.GOLD,
                color: "black",
              }}
              data-testid="button-confirm-import"
            >
              {importMutation.isPending ? (
                <><Loader2 className="w-4 h-4 animate-spin" />Saving…</>
              ) : flagged.length > 0 ? (
                <><AlertTriangle className="w-4 h-4" />Import Anyway ({editableItems.length})</>
              ) : (
                <><CheckCheck className="w-4 h-4" />Add {editableItems.length} Item{editableItems.length !== 1 ? "s" : ""} to Net Worth</>
              )}
            </Button>
          </div>
        </div>

      </div>
    </AppLayout>
  );
}
