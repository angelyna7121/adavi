import { useCallback, useRef, useState } from "react";
import { Upload, X, CheckCircle, AlertCircle, FileText, ImageIcon, Sheet, RefreshCw, FolderOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DS } from "@/lib/design";

// ── Types ────────────────────────────────────────────────────────────────────

export type AcceptedType = "pdf" | "jpg" | "jpeg" | "png" | "csv" | "xlsx";

export interface UploadedFile {
  id: string;
  file: File;
  status: "pending" | "uploading" | "done" | "error";
  progress: number;
  error?: string;
  preview?: string;
}

export interface FileUploadProps {
  /**
   * Async function called for each file. Receives the File and a progress
   * callback (0-100). If omitted the component runs a realistic simulation.
   */
  onUpload?: (file: File, onProgress: (pct: number) => void) => Promise<void>;
  /** Which file types to accept. Defaults to all five. */
  accept?: AcceptedType[];
  /** Max file size in MB (default 10). */
  maxSizeMB?: number;
  /** Max total queued files (default 10). */
  maxFiles?: number;
  /** Fires whenever the file list changes. */
  onFilesChange?: (files: UploadedFile[]) => void;
  className?: string;
  /** If true, only allow one file at a time. */
  single?: boolean;
}

// ── Constants ────────────────────────────────────────────────────────────────

const TYPE_META: Record<AcceptedType, { mime: string[]; label: string }> = {
  pdf:  { mime: ["application/pdf"],                                                        label: "PDF"  },
  jpg:  { mime: ["image/jpeg"],                                                             label: "JPG"  },
  jpeg: { mime: ["image/jpeg"],                                                             label: "JPEG" },
  png:  { mime: ["image/png"],                                                              label: "PNG"  },
  csv:  { mime: ["text/csv", "application/csv"],                                            label: "CSV"  },
  xlsx: { mime: ["application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                 "application/vnd.ms-excel"],                                              label: "XLSX" },
};

const DEFAULT_ACCEPT: AcceptedType[] = ["pdf", "jpg", "png", "csv", "xlsx"];

function uid() {
  return Math.random().toString(36).slice(2);
}

function fileIcon(file: File) {
  if (file.type.startsWith("image/")) return ImageIcon;
  if (file.type === "application/pdf") return FileText;
  return Sheet;
}

function fileIconColor(file: File) {
  if (file.type.startsWith("image/")) return DS.BLUE;
  if (file.type === "application/pdf") return DS.RED;
  return DS.GREEN;
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// ── Simulation ───────────────────────────────────────────────────────────────

async function simulateUpload(
  file: File,
  onProgress: (pct: number) => void,
): Promise<void> {
  const duration = 800 + file.size / 20_000; // bigger files take longer
  const start = Date.now();
  return new Promise<void>((resolve, reject) => {
    // 2 % chance of simulated error for demo purposes
    const willFail = false;
    function tick() {
      const elapsed = Date.now() - start;
      const raw = elapsed / duration;
      // Ease-out curve that slows near 90%, then jumps to 100 at resolve
      const pct = Math.min(90, Math.round(100 * (1 - Math.pow(1 - raw, 2))));
      onProgress(pct);
      if (elapsed >= duration) {
        if (willFail) {
          reject(new Error("Server rejected the file"));
        } else {
          onProgress(100);
          resolve();
        }
      } else {
        requestAnimationFrame(tick);
      }
    }
    requestAnimationFrame(tick);
  });
}

// ── Main component ────────────────────────────────────────────────────────────

export function FileUpload({
  onUpload,
  accept = DEFAULT_ACCEPT,
  maxSizeMB = 10,
  maxFiles = 10,
  onFilesChange,
  className = "",
  single = false,
}: FileUploadProps) {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [dragging, setDragging] = useState(false);
  const [dragError, setDragError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Accepted MIME set for fast lookup
  const acceptedMimes = new Set<string>(
    accept.flatMap(t => TYPE_META[t]?.mime ?? []),
  );
  const acceptedLabels = accept
    .map(t => TYPE_META[t]?.label)
    .filter(Boolean)
    .join(", ");

  // ── Helpers ────────────────────────────────────────────────────────────────

  function update(id: string, patch: Partial<UploadedFile>) {
    setFiles(prev => {
      const next = prev.map(f => f.id === id ? { ...f, ...patch } : f);
      onFilesChange?.(next);
      return next;
    });
  }

  function validateFile(file: File): string | null {
    // Check MIME — also allow by extension as fallback (XLSX often has wrong MIME)
    const ext = file.name.split(".").pop()?.toLowerCase() as AcceptedType | undefined;
    const mimeOk = acceptedMimes.has(file.type);
    const extOk  = ext !== undefined && accept.includes(ext);
    if (!mimeOk && !extOk) {
      return `${file.name}: unsupported type. Accepted: ${acceptedLabels}`;
    }
    if (file.size > maxSizeMB * 1024 * 1024) {
      return `${file.name}: exceeds ${maxSizeMB} MB limit (${formatBytes(file.size)})`;
    }
    return null;
  }

  async function enqueueFiles(incoming: File[]) {
    setDragError(null);

    const current = files.length;
    const capacity = maxFiles - current;

    if (single) {
      incoming = incoming.slice(0, 1);
    }

    const errors: string[] = [];
    const valid: File[] = [];

    for (const file of incoming) {
      if (valid.length >= capacity) {
        errors.push(`Max ${maxFiles} files — ${incoming.length - valid.length} file(s) skipped`);
        break;
      }
      const err = validateFile(file);
      if (err) { errors.push(err); continue; }
      valid.push(file);
    }

    if (errors.length) {
      setDragError(errors[0]); // show first error prominently
    }

    if (!valid.length) return;

    const newEntries: UploadedFile[] = valid.map(file => ({
      id: uid(),
      file,
      status: "pending",
      progress: 0,
      preview: file.type.startsWith("image/") ? URL.createObjectURL(file) : undefined,
    }));

    setFiles(prev => {
      const next = [...(single ? [] : prev), ...newEntries];
      onFilesChange?.(next);
      return next;
    });

    // Kick off uploads
    for (const entry of newEntries) {
      upload(entry);
    }
  }

  async function upload(entry: UploadedFile) {
    update(entry.id, { status: "uploading", progress: 0 });

    const progressCb = (pct: number) => update(entry.id, { progress: pct });

    try {
      if (onUpload) {
        await onUpload(entry.file, progressCb);
      } else {
        await simulateUpload(entry.file, progressCb);
      }
      update(entry.id, { status: "done", progress: 100 });
    } catch (err: any) {
      update(entry.id, {
        status: "error",
        progress: 0,
        error: err?.message ?? "Upload failed — please try again",
      });
    }
  }

  function retry(entry: UploadedFile) {
    update(entry.id, { status: "pending", progress: 0, error: undefined });
    upload(entry);
  }

  function remove(id: string) {
    setFiles(prev => {
      const next = prev.filter(f => {
        if (f.id !== id) return true;
        if (f.preview) URL.revokeObjectURL(f.preview);
        return false;
      });
      onFilesChange?.(next);
      return next;
    });
  }

  // ── Drag handlers ──────────────────────────────────────────────────────────

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(true);
    setDragError(null);
  }, []);

  const onDragLeave = useCallback((e: React.DragEvent) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setDragging(false);
    }
  }, []);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const dropped = Array.from(e.dataTransfer.files);
    enqueueFiles(dropped);
  }, [files, accept, maxSizeMB, maxFiles, single]); // eslint-disable-line

  const onInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) enqueueFiles(Array.from(e.target.files));
    e.target.value = "";
  }, [files, accept, maxSizeMB, maxFiles, single]); // eslint-disable-line

  // ── Render ─────────────────────────────────────────────────────────────────

  const allDone = files.length > 0 && files.every(f => f.status === "done");
  const hasUploading = files.some(f => f.status === "uploading");
  const atMax = single ? files.length >= 1 : files.length >= maxFiles;

  return (
    <div className={className} data-testid="file-upload-root">

      {/* ── Drop zone ── */}
      {!atMax && (
        <div
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
          onClick={() => inputRef.current?.click()}
          data-testid="drop-zone"
          className="rounded-2xl border-2 border-dashed transition-all duration-200 cursor-pointer select-none"
          style={{
            background: dragging ? "rgba(197,163,90,0.08)" : DS.CARD,
            borderColor: dragging ? DS.GOLD : dragError ? DS.RED : DS.BORDER2,
            boxShadow: dragging ? `0 0 0 4px rgba(197,163,90,0.12)` : "none",
          }}
        >
          <div className="flex flex-col items-center gap-3 py-10 px-6 text-center pointer-events-none">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center transition-colors duration-200"
              style={{ background: dragging ? DS.GOLD_BG2 : DS.GOLD_BG }}
            >
              <Upload className="w-6 h-6" style={{ color: DS.GOLD }} />
            </div>
            <div>
              <p className="font-semibold text-white text-sm">
                {dragging ? "Drop files here" : "Drag & drop files here"}
              </p>
              <p className="text-xs mt-1" style={{ color: DS.MUTED }}>
                or{" "}
                <span className="underline underline-offset-2" style={{ color: DS.GOLD }}>
                  click to browse
                </span>
              </p>
            </div>
            <div className="flex flex-wrap justify-center gap-1.5 mt-1">
              {accept.map(t => (
                <span
                  key={t}
                  className="rounded-md px-2 py-0.5 text-xs font-mono font-semibold uppercase tracking-wide"
                  style={{ background: DS.GHOST, color: DS.MUTED }}
                >
                  .{t}
                </span>
              ))}
            </div>
            <p className="text-xs" style={{ color: DS.DIM }}>
              Max {maxSizeMB} MB per file
              {!single && ` · up to ${maxFiles} files`}
            </p>
          </div>
          <input
            ref={inputRef}
            type="file"
            multiple={!single}
            accept={accept.flatMap(t => TYPE_META[t]?.mime ?? []).join(",")}
            onChange={onInputChange}
            className="sr-only"
            data-testid="file-input"
          />
        </div>
      )}

      {/* ── Drag / validation error ── */}
      {dragError && (
        <div
          className="mt-3 rounded-xl border px-4 py-3 flex items-start gap-2.5 text-sm"
          style={{ background: "rgba(248,113,113,0.07)", borderColor: "rgba(248,113,113,0.25)", color: DS.RED }}
          data-testid="error-validation"
        >
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{dragError}</span>
          <button
            className="ml-auto shrink-0 opacity-60 hover:opacity-100"
            onClick={() => setDragError(null)}
            data-testid="button-dismiss-error"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* ── File list ── */}
      {files.length > 0 && (
        <div className="mt-4 space-y-2.5" data-testid="file-list">

          {/* Summary bar when all done */}
          {allDone && (
            <div
              className="rounded-xl border px-4 py-2.5 flex items-center gap-2 text-sm"
              style={{ background: "rgba(74,222,128,0.07)", borderColor: "rgba(74,222,128,0.2)", color: DS.GREEN }}
              data-testid="status-all-done"
            >
              <CheckCircle className="w-4 h-4 shrink-0" />
              <span>{files.length} file{files.length !== 1 ? "s" : ""} uploaded successfully</span>
              <button
                className="ml-auto text-xs underline opacity-60 hover:opacity-100"
                style={{ color: DS.MUTED }}
                onClick={() => setFiles([])}
                data-testid="button-clear-all"
              >
                Clear all
              </button>
            </div>
          )}

          {files.map(f => {
            const Icon = fileIcon(f.file);
            const iconColor = fileIconColor(f.file);
            return (
              <div
                key={f.id}
                className="rounded-xl border overflow-hidden"
                style={{ background: DS.CARD, borderColor: DS.BORDER }}
                data-testid={`file-item-${f.id}`}
              >
                <div className="flex items-center gap-3 px-4 py-3">

                  {/* Icon / thumbnail */}
                  <div
                    className="w-9 h-9 rounded-lg shrink-0 flex items-center justify-center overflow-hidden"
                    style={{ background: DS.GHOST }}
                  >
                    {f.preview ? (
                      <img
                        src={f.preview}
                        alt={f.file.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Icon className="w-4 h-4" style={{ color: iconColor }} />
                    )}
                  </div>

                  {/* Name + meta */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate" data-testid={`filename-${f.id}`}>
                      {f.file.name}
                    </p>
                    <p className="text-xs mt-0.5" style={{ color: DS.DIM }}>
                      {formatBytes(f.file.size)}
                      {f.status === "error" && f.error && (
                        <span className="ml-2" style={{ color: DS.RED }}>
                          {f.error}
                        </span>
                      )}
                    </p>
                  </div>

                  {/* Status indicator */}
                  <div className="shrink-0 flex items-center gap-2">
                    {f.status === "done" && (
                      <CheckCircle className="w-4 h-4" style={{ color: DS.GREEN }} data-testid={`status-done-${f.id}`} />
                    )}
                    {f.status === "error" && (
                      <button
                        title="Retry"
                        onClick={() => retry(f)}
                        className="flex items-center gap-1 text-xs font-medium rounded-md px-2 py-1 transition-colors"
                        style={{ color: DS.GOLD, background: DS.GOLD_BG }}
                        data-testid={`button-retry-${f.id}`}
                      >
                        <RefreshCw className="w-3 h-3" />
                        Retry
                      </button>
                    )}
                    {f.status === "uploading" && (
                      <span className="text-xs tabular-nums" style={{ color: DS.MUTED }}>
                        {f.progress}%
                      </span>
                    )}
                    <button
                      onClick={() => remove(f.id)}
                      className="rounded-md p-1 transition-colors hover:bg-white/5"
                      style={{ color: DS.DIM }}
                      title="Remove"
                      data-testid={`button-remove-${f.id}`}
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Progress bar */}
                {(f.status === "uploading" || (f.status === "pending" && !allDone)) && (
                  <div className="h-0.5 w-full" style={{ background: DS.BORDER }}>
                    <div
                      className="h-full transition-all duration-300 ease-out"
                      style={{
                        width: `${f.progress}%`,
                        background: DS.GOLD,
                      }}
                      data-testid={`progress-bar-${f.id}`}
                    />
                  </div>
                )}
                {f.status === "error" && (
                  <div className="h-0.5 w-full" style={{ background: "rgba(248,113,113,0.35)" }} />
                )}
                {f.status === "done" && (
                  <div className="h-0.5 w-full" style={{ background: "rgba(74,222,128,0.35)" }} />
                )}
              </div>
            );
          })}

          {/* Browse more button when not at max */}
          {!atMax && !hasUploading && files.length > 0 && (
            <button
              onClick={() => inputRef.current?.click()}
              className="flex items-center gap-2 text-sm px-3 py-2 rounded-lg w-full transition-colors hover:bg-white/5"
              style={{ color: DS.MUTED }}
              data-testid="button-add-more"
            >
              <FolderOpen className="w-4 h-4" />
              Add more files
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default FileUpload;
