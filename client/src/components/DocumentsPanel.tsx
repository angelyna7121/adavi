import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  FileText, ImageIcon, Sheet, Download, Trash2,
  FolderOpen, AlertCircle, Clock, CheckCircle2, Loader2,
  TableProperties,
} from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { DS } from "@/lib/design";

// ── Types ─────────────────────────────────────────────────────────────────────

interface UploadedDoc {
  id: number;
  userId: number;
  originalName: string;
  fileType: string;
  fileSize: number | null;
  status: string;
  documentType: string | null;
  extractedText: string | null;
  createdAt: string;
}

export interface DocumentsPanelProps {
  /** Called when user clicks "Upload Another" or the empty-state CTA. */
  onUploadMore?: () => void;
  className?: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatBytes(bytes: number | null): string {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-CA", {
    month: "short", day: "numeric", year: "numeric",
  });
}

// ── File-type icon + colour ───────────────────────────────────────────────────

function FileIcon({ type }: { type: string }) {
  const cfg: Record<string, { Icon: React.ElementType; color: string; bg: string }> = {
    pdf:  { Icon: FileText,  color: DS.RED,    bg: "rgba(248,113,113,0.1)" },
    jpg:  { Icon: ImageIcon, color: DS.BLUE,   bg: "rgba(96,165,250,0.1)"  },
    jpeg: { Icon: ImageIcon, color: DS.BLUE,   bg: "rgba(96,165,250,0.1)"  },
    png:  { Icon: ImageIcon, color: DS.BLUE,   bg: "rgba(96,165,250,0.1)"  },
    csv:  { Icon: Sheet,     color: DS.GOLD,   bg: DS.GOLD_BG              },
    xlsx: { Icon: Sheet,     color: DS.GREEN,  bg: "rgba(74,222,128,0.1)"  },
  };
  const { Icon, color, bg } = cfg[type.toLowerCase()] ?? {
    Icon: FileText, color: DS.MUTED, bg: DS.GHOST,
  };
  return (
    <div
      className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
      style={{ background: bg }}
    >
      <Icon className="w-4 h-4" style={{ color }} />
    </div>
  );
}

// ── Status badge ─────────────────────────────────────────────────────────────

const STATUS_MAP: Record<string, { label: string; color: string; bg: string; Icon: React.ElementType }> = {
  uploaded:   { label: "Ready for Review",   color: DS.GREEN,  bg: "rgba(74,222,128,0.1)",   Icon: CheckCircle2 },
  processing: { label: "Being Analyzed",     color: DS.GOLD,   bg: DS.GOLD_BG,               Icon: Loader2      },
  done:       { label: "Analysis Complete",  color: DS.GREEN,  bg: "rgba(74,222,128,0.1)",   Icon: CheckCircle2 },
  error:      { label: "Could Not Be Read",  color: DS.RED,    bg: "rgba(248,113,113,0.1)",  Icon: AlertCircle  },
};

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_MAP[status] ?? {
    label: "Waiting",
    color: DS.MUTED,
    bg: DS.GHOST,
    Icon: Clock,
  };
  const { label, color, bg, Icon } = cfg;
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium"
      style={{ background: bg, color }}
    >
      <Icon className={`w-3 h-3 ${status === "processing" ? "animate-spin" : ""}`} />
      {label}
    </span>
  );
}

// ── Processing result ─────────────────────────────────────────────────────────

function ProcessingResult({ doc }: { doc: UploadedDoc }) {
  if (doc.extractedText) {
    return (
      <p className="text-xs mt-1.5 line-clamp-2 italic" style={{ color: DS.MUTED }}>
        "{doc.extractedText.trim().slice(0, 120)}{doc.extractedText.length > 120 ? "…" : ""}"
      </p>
    );
  }
  if (doc.documentType) {
    return (
      <p className="text-xs mt-1.5" style={{ color: DS.MUTED }}>
        Identified as: <span style={{ color: DS.SILVER }}>{doc.documentType}</span>
      </p>
    );
  }
  if (doc.status === "uploaded") {
    return (
      <p className="text-xs mt-1.5" style={{ color: DS.DIM }}>
        Your file is saved and ready. No items have been extracted yet.
      </p>
    );
  }
  if (doc.status === "error") {
    return (
      <p className="text-xs mt-1.5" style={{ color: "rgba(248,113,113,0.7)" }}>
        We couldn't read this file. Try uploading a different format.
      </p>
    );
  }
  return null;
}

// ── Loading skeleton ──────────────────────────────────────────────────────────

function Skeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3].map(i => (
        <div
          key={i}
          className="rounded-2xl border p-4 animate-pulse"
          style={{ background: DS.CARD, borderColor: DS.BORDER, height: 88 }}
        />
      ))}
    </div>
  );
}

// ── Empty state ───────────────────────────────────────────────────────────────

function EmptyState({ onUploadMore }: { onUploadMore?: () => void }) {
  return (
    <div
      className="rounded-2xl border p-10 text-center"
      style={{ background: DS.CARD, borderColor: DS.BORDER }}
      data-testid="documents-empty"
    >
      <div
        className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
        style={{ background: DS.GOLD_BG2 }}
      >
        <FolderOpen className="w-6 h-6" style={{ color: DS.GOLD }} />
      </div>
      <p className="font-semibold text-white mb-1">No documents yet</p>
      <p className="text-sm mb-5" style={{ color: DS.MUTED }}>
        Upload a bank statement, tax form, or financial document to get started.
      </p>
      {onUploadMore && (
        <Button
          onClick={onUploadMore}
          className="font-semibold"
          style={{ background: DS.GOLD, color: "black" }}
          data-testid="button-upload-first"
        >
          Upload your first document
        </Button>
      )}
    </div>
  );
}

// ── Document row ──────────────────────────────────────────────────────────────

function DocumentRow({
  doc,
  onDelete,
}: {
  doc: UploadedDoc;
  onDelete: (id: number) => void;
}) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const qc = useQueryClient();

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/documents/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.message ?? "Couldn't delete the file");
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/documents"] });
      onDelete(doc.id);
    },
  });

  return (
    <div
      className="rounded-2xl border p-4 transition-all duration-200"
      style={{ background: DS.CARD, borderColor: DS.BORDER }}
      data-testid={`doc-row-${doc.id}`}
    >
      <div className="flex items-start gap-3">
        <FileIcon type={doc.fileType} />

        {/* Main content */}
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-start gap-x-3 gap-y-1">
            <p
              className="text-sm font-semibold text-white truncate max-w-[260px]"
              title={doc.originalName}
              data-testid={`doc-name-${doc.id}`}
            >
              {doc.originalName}
            </p>
            <StatusBadge status={doc.status} />
          </div>

          <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-0.5">
            <span className="text-xs" style={{ color: DS.DIM }}>
              {formatBytes(doc.fileSize)}
            </span>
            <span className="text-xs" style={{ color: DS.DIM }}>
              {doc.fileType.toUpperCase()}
            </span>
            <span className="text-xs" style={{ color: DS.DIM }}>
              Uploaded {formatDate(doc.createdAt)}
            </span>
          </div>

          <ProcessingResult doc={doc} />
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1.5 shrink-0 ml-1">
          {/* CSV: Review Import button */}
          {(["csv", "xlsx", "pdf", "jpg", "png"].includes(doc.fileType ?? "")) && doc.status !== "done" && (
            <Link href={`/documents/${doc.id}/review`}>
              <button
                className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-colors hover:opacity-90"
                style={{ background: DS.GOLD_BG2, color: DS.GOLD, border: `1px solid ${DS.GOLD_BORDER}` }}
                title="Parse CSV and review items"
                data-testid={`button-review-${doc.id}`}
              >
                <TableProperties className="w-3.5 h-3.5" />
                Review
              </button>
            </Link>
          )}

          {/* Download */}
          <a
            href={`/api/documents/${doc.id}/download`}
            download={doc.originalName}
            className="rounded-lg p-2 transition-colors hover:bg-white/5 flex items-center"
            title="Download file"
            data-testid={`button-download-${doc.id}`}
          >
            <Download className="w-3.5 h-3.5" style={{ color: DS.MUTED }} />
          </a>

          {/* Delete — two-step confirm */}
          {confirmDelete ? (
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setConfirmDelete(false)}
                className="text-xs rounded-md px-2 py-1 transition-colors hover:bg-white/5"
                style={{ color: DS.MUTED }}
                data-testid={`button-cancel-delete-${doc.id}`}
              >
                Keep
              </button>
              <button
                onClick={() => deleteMutation.mutate(doc.id)}
                disabled={deleteMutation.isPending}
                className="text-xs font-semibold rounded-md px-2 py-1 transition-colors"
                style={{ background: "rgba(248,113,113,0.12)", color: DS.RED }}
                data-testid={`button-confirm-delete-${doc.id}`}
              >
                {deleteMutation.isPending ? "Removing…" : "Remove"}
              </button>
            </div>
          ) : (
            <button
              onClick={() => setConfirmDelete(true)}
              className="rounded-lg p-2 transition-colors hover:bg-red-500/10 group"
              title="Remove document"
              data-testid={`button-delete-${doc.id}`}
            >
              <Trash2 className="w-3.5 h-3.5 transition-colors group-hover:text-red-400" style={{ color: DS.DIM }} />
            </button>
          )}
        </div>
      </div>

      {/* Delete error */}
      {deleteMutation.isError && (
        <p className="text-xs mt-2 ml-13 pl-13" style={{ color: DS.RED }}>
          {(deleteMutation.error as Error)?.message}
        </p>
      )}
    </div>
  );
}

// ── Main panel ────────────────────────────────────────────────────────────────

export function DocumentsPanel({ onUploadMore, className = "" }: DocumentsPanelProps) {
  const [deleted, setDeleted] = useState<Set<number>>(new Set());

  const { data, isLoading, isError } = useQuery<UploadedDoc[] | null>({
    queryKey: ["/api/documents"],
    queryFn: async () => {
      const res = await fetch("/api/documents", { credentials: "include" });
      if (res.status === 401) return null; // not signed in — render sign-in prompt
      if (!res.ok) throw new Error(`${res.status}`);
      return res.json() as Promise<UploadedDoc[]>;
    },
    refetchInterval: (query) => {
      const d = query.state.data ?? [];
      return Array.isArray(d) && d.some(doc => doc.status === "processing") ? 4000 : false;
    },
  });

  // null → unauthenticated; [] → signed in but no docs yet
  const notSignedIn = !isLoading && !isError && data === null;
  const docs = Array.isArray(data) ? data : [];
  const visibleDocs = docs.filter(d => !deleted.has(d.id));

  return (
    <div className={className} data-testid="documents-panel">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-base font-semibold text-white">Your Documents</h2>
          {!isLoading && visibleDocs.length > 0 && (
            <p className="text-xs mt-0.5" style={{ color: DS.MUTED }}>
              {visibleDocs.length} file{visibleDocs.length !== 1 ? "s" : ""} saved
            </p>
          )}
        </div>
        {onUploadMore && visibleDocs.length > 0 && (
          <Button
            size="sm"
            onClick={onUploadMore}
            className="font-semibold text-xs h-8"
            style={{ background: DS.GOLD_BG2, color: DS.GOLD, border: `1px solid ${DS.GOLD_BORDER}` }}
            data-testid="button-upload-more"
          >
            + Upload more
          </Button>
        )}
      </div>

      {/* Body */}
      {isLoading && <Skeleton />}

      {isError && (
        <div
          className="rounded-2xl border px-4 py-3 flex items-center gap-2.5 text-sm"
          style={{ background: "rgba(248,113,113,0.07)", borderColor: "rgba(248,113,113,0.2)", color: DS.RED }}
          data-testid="documents-error"
        >
          <AlertCircle className="w-4 h-4 shrink-0" />
          We couldn't load your documents — please refresh the page.
        </div>
      )}

      {notSignedIn && (
        <div
          className="rounded-2xl border p-8 text-center"
          style={{ background: DS.CARD, borderColor: DS.BORDER }}
          data-testid="documents-sign-in-prompt"
        >
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-3"
            style={{ background: DS.GOLD_BG2 }}
          >
            <FolderOpen className="w-5 h-5" style={{ color: DS.GOLD }} />
          </div>
          <p className="font-semibold text-white mb-1">Save your documents</p>
          <p className="text-sm mb-5 max-w-xs mx-auto" style={{ color: DS.MUTED }}>
            Create a free account to save and revisit everything you upload.
          </p>
          <a
            href="/signup"
            className="inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-semibold transition-opacity hover:opacity-90"
            style={{ background: DS.GOLD, color: "black" }}
            data-testid="link-sign-up-docs"
          >
            Create a free account
          </a>
        </div>
      )}

      {!isLoading && !isError && !notSignedIn && visibleDocs.length === 0 && (
        <EmptyState onUploadMore={onUploadMore} />
      )}

      {!isLoading && !isError && visibleDocs.length > 0 && (
        <div className="space-y-3">
          {visibleDocs.map(doc => (
            <DocumentRow
              key={doc.id}
              doc={doc}
              onDelete={id => setDeleted(prev => new Set([...prev, id]))}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default DocumentsPanel;
