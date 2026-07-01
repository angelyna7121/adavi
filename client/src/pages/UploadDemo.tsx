import { useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { FileUpload, UploadedFile } from "@/components/FileUpload";
import { ProcessingTimeline, useProcessingTimeline } from "@/components/ProcessingTimeline";
import { DocumentsPanel } from "@/components/DocumentsPanel";
import AppLayout from "@/components/layout/AppLayout";
import { DS } from "@/lib/design";
import { useState } from "react";
import { Layers } from "lucide-react";

// ── Upload helper ─────────────────────────────────────────────────────────────

async function postToServer(file: File, onProgress: (pct: number) => void): Promise<void> {
  const form = new FormData();
  form.append("files", file);

  let fake = 0;
  const ticker = setInterval(() => {
    fake = Math.min(88, fake + 8 + Math.random() * 6);
    onProgress(Math.round(fake));
  }, 200);

  try {
    const res = await fetch("/api/documents", {
      method: "POST",
      body: form,
      credentials: "include",
    });
    clearInterval(ticker);

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body?.message ?? "Upload failed. Please try again.");
    }

    const data: { results: Array<{ status: "ok" | "error"; error?: string }> } = await res.json();
    const result = data.results?.[0];
    if (!result || result.status === "error") {
      throw new Error(result?.error ?? "Your file could not be processed");
    }
    onProgress(100);
  } catch (err) {
    clearInterval(ticker);
    throw err;
  }
}

// ── Upload + timeline section ─────────────────────────────────────────────────

function UploadSection({ onUploadDone }: { onUploadDone: () => void }) {
  const [file, setFile] = useState<UploadedFile | null>(null);
  const qc = useQueryClient();

  const isDone = file?.status === "done";
  const timelineStep = useProcessingTimeline(isDone);
  const allProcessed = timelineStep >= 4;

  // After upload finishes, refresh the panel list
  const handleUpload = async (f: File, onProgress: (pct: number) => void) => {
    await postToServer(f, onProgress);
    qc.invalidateQueries({ queryKey: ["/api/documents"] });
    // After the processing animation completes (~6.5s), nudge user to panel
    setTimeout(onUploadDone, 7000);
  };

  const handleFilesChange = (files: UploadedFile[]) => {
    const latest = files[files.length - 1];
    if (latest) setFile(latest);
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 items-start">
      {/* Drop zone */}
      <FileUpload
        accept={["pdf", "csv", "xlsx", "jpg", "png"]}
        maxSizeMB={10}
        single
        onUpload={handleUpload}
        onFilesChange={handleFilesChange}
      />

      {/* Timeline — slides in once file is chosen */}
      {file && (
        <div
          className="rounded-2xl border p-5 transition-all duration-500"
          style={{
            background: DS.CARD,
            borderColor: allProcessed ? DS.GOLD_BORDER : DS.BORDER,
            boxShadow: allProcessed ? DS.SHADOW_GOLD_SM : "none",
          }}
          data-testid="timeline-card"
        >
          <ProcessingTimeline
            currentStep={timelineStep}
            error={file.status === "error" ? (file.error ?? "Something went wrong.") : undefined}
            filename={file.file.name}
          />
        </div>
      )}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function UploadDemo() {
  const panelRef = useRef<HTMLDivElement>(null);

  const scrollToPanel = () => {
    panelRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <AppLayout>
      <div className="container mx-auto px-4 py-10 max-w-3xl space-y-14">

        {/* Header */}
        <div>
          <div className="flex items-center gap-2.5 mb-2">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: DS.GOLD_BG2 }}
            >
              <Layers className="w-4 h-4" style={{ color: DS.GOLD }} />
            </div>
            <span
              className="text-xs font-semibold uppercase tracking-widest"
              style={{ color: DS.GOLD }}
            >
              Document Hub
            </span>
          </div>
          <h1 className="text-3xl font-bold text-white">Upload a Document</h1>
          <p className="mt-2 text-sm" style={{ color: DS.MUTED }}>
            Upload a bank statement, tax form, or financial document.
            We'll read it and organize everything for your review.
          </p>
        </div>

        {/* ── Upload + timeline ── */}
        <section>
          <h2 className="text-base font-semibold text-white mb-1">Add a document</h2>
          <p className="text-xs mb-4" style={{ color: DS.MUTED }}>
            PDF, CSV, XLSX, JPG or PNG · max 10 MB
          </p>
          <UploadSection onUploadDone={scrollToPanel} />
        </section>

        {/* ── Saved documents panel ── */}
        <section ref={panelRef}>
          <DocumentsPanel onUploadMore={() => window.scrollTo({ top: 0, behavior: "smooth" })} />
        </section>

      </div>
    </AppLayout>
  );
}
