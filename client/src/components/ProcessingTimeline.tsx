import { useEffect, useRef, useState } from "react";
import { FileCheck, ScanText, Search, Sparkles, X, CheckCheck } from "lucide-react";
import { DS } from "@/lib/design";

// ── Step definitions ──────────────────────────────────────────────────────────

export interface TimelineStep {
  label: string;
  description: string;
  icon: React.ElementType;
}

export const DEFAULT_STEPS: TimelineStep[] = [
  {
    label: "Document Uploaded",
    description: "Your file arrived safely and is being prepared.",
    icon: FileCheck,
  },
  {
    label: "Reading Your Statement",
    description: "Scanning the contents and structure of your document.",
    icon: ScanText,
  },
  {
    label: "Finding Assets and Debts",
    description: "Identifying balances, accounts, and line-item categories.",
    icon: Search,
  },
  {
    label: "Ready for Review",
    description: "Everything is organized and ready for your review.",
    icon: Sparkles,
  },
];

// ── Props ─────────────────────────────────────────────────────────────────────

export interface ProcessingTimelineProps {
  /**
   * Index of the currently active step (0-based).
   *   -1              → not started (all steps dim)
   *   0 … steps-1     → that step is active
   *   steps.length    → all steps are done
   */
  currentStep?: number;
  /** If provided, the current step renders in error state with this message. */
  error?: string;
  /** Override the default four steps. */
  steps?: TimelineStep[];
  /** Optional filename to personalize the header. */
  filename?: string;
  className?: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

type StepState = "waiting" | "active" | "done" | "error";

function resolveState(
  index: number,
  current: number,
  total: number,
  hasError: boolean,
): StepState {
  if (current >= total) return "done";
  if (index < current) return "done";
  if (index === current) return hasError ? "error" : "active";
  return "waiting";
}

// ── Step icon ─────────────────────────────────────────────────────────────────

function StepIcon({ state, Icon }: { state: StepState; Icon: React.ElementType }) {
  const base = "w-10 h-10 rounded-full flex items-center justify-center shrink-0";

  if (state === "done") {
    return (
      <div className={base} style={{ background: DS.GOLD, boxShadow: "0 0 0 4px rgba(197,163,90,0.18)" }}>
        <CheckCheck className="w-4 h-4 text-black" strokeWidth={2.5} />
      </div>
    );
  }

  if (state === "error") {
    return (
      <div className={base} style={{ background: "rgba(248,113,113,0.12)", border: `2px solid ${DS.RED}` }}>
        <X className="w-4 h-4" style={{ color: DS.RED }} />
      </div>
    );
  }

  if (state === "active") {
    return (
      <div className={`${base} ptl-ring`} style={{ background: DS.GOLD_BG2, border: `2px solid ${DS.GOLD}` }}>
        <Icon className="w-4 h-4 ptl-spin" style={{ color: DS.GOLD }} />
      </div>
    );
  }

  return (
    <div className={base} style={{ background: DS.GHOST, border: `1.5px solid ${DS.BORDER2}` }}>
      <Icon className="w-4 h-4" style={{ color: DS.DIM }} />
    </div>
  );
}

// ── Connector line ────────────────────────────────────────────────────────────

function Connector({ filled }: { filled: boolean }) {
  return (
    <div style={{ width: 40, display: "flex", justifyContent: "center", minHeight: 24 }}>
      <div
        className="w-px transition-colors duration-700"
        style={{
          minHeight: 24,
          background: filled ? DS.GOLD : DS.BORDER,
        }}
      />
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function ProcessingTimeline({
  currentStep = -1,
  error,
  steps = DEFAULT_STEPS,
  filename,
  className = "",
}: ProcessingTimelineProps) {
  const total = steps.length;
  const allDone = currentStep >= total;
  const hasError = !!error && currentStep >= 0 && currentStep < total;

  return (
    <div className={className} data-testid="processing-timeline">
      {/* Keyframe animations */}
      <style>{`
        @keyframes ptl-pulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(197,163,90,0.55); }
          50%       { box-shadow: 0 0 0 9px rgba(197,163,90,0); }
        }
        @keyframes ptl-spin {
          to { transform: rotate(360deg); }
        }
        .ptl-ring  { animation: ptl-pulse 1.8s ease-in-out infinite; }
        .ptl-spin  { animation: ptl-spin  2.4s linear infinite; }
      `}</style>

      {/* Header */}
      <div className="mb-5">
        <p className="text-sm font-semibold text-white truncate">
          {filename
            ? <>Processing <span style={{ color: DS.GOLD }}>{filename}</span></>
            : "Processing your document…"}
        </p>
        {allDone && !hasError && (
          <p className="text-xs mt-1" style={{ color: DS.GREEN }}>
            All done — your document is ready to review.
          </p>
        )}
        {hasError && (
          <p className="text-xs mt-1" style={{ color: DS.RED }}>
            Something went wrong — please try uploading again.
          </p>
        )}
        {!allDone && !hasError && currentStep >= 0 && (
          <p className="text-xs mt-1" style={{ color: DS.MUTED }}>
            Step {currentStep + 1} of {total}
          </p>
        )}
      </div>

      {/* Steps */}
      <div>
        {steps.map((step, i) => {
          const state = resolveState(i, currentStep, total, hasError && i === currentStep);
          const isLast = i === total - 1;

          return (
            <div key={i} data-testid={`timeline-step-${i}`}>
              {/* Row */}
              <div className="flex items-start gap-4">
                <StepIcon state={state} Icon={step.icon} />
                <div className="flex-1 pb-5 min-w-0">
                  <p
                    className="text-sm font-semibold leading-snug transition-colors duration-400"
                    style={{
                      color: state === "done"   ? DS.GOLD
                           : state === "active" ? DS.WHITE
                           : state === "error"  ? DS.RED
                           : DS.DIM,
                    }}
                  >
                    {step.label}
                  </p>
                  <p
                    className="text-xs mt-0.5 transition-colors duration-400"
                    style={{
                      color: state === "active"  ? DS.MUTED
                           : state === "done"    ? "rgba(255,255,255,0.30)"
                           : state === "error"   ? "rgba(248,113,113,0.7)"
                           : "rgba(255,255,255,0.18)",
                    }}
                  >
                    {state === "error" ? error : step.description}
                  </p>
                </div>
              </div>

              {/* Connector */}
              {!isLast && (
                <div className="flex items-stretch gap-4" style={{ marginTop: -16, marginBottom: 0 }}>
                  <Connector filled={state === "done"} />
                  <div className="flex-1" />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Auto-advancing hook ───────────────────────────────────────────────────────

/**
 * Returns the current step (0-based) after `active` becomes true.
 * Automatically advances through each step using the provided delays.
 *
 * @param active  Trigger: starts at step 0 when this becomes true, resets when false.
 * @param delays  Array of millisecond delays before each step activates.
 *                Length must equal the number of steps.
 *                Defaults: [0, 1800, 3800, 6200] — step 0 is immediate.
 */
export function useProcessingTimeline(
  active: boolean,
  delays: number[] = [0, 1800, 3800, 6200],
): number {
  const [step, setStep] = useState(-1);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    // Clear any running timers
    timers.current.forEach(clearTimeout);
    timers.current = [];

    if (!active) {
      setStep(-1);
      return;
    }

    // Immediately activate step 0
    setStep(0);

    // Queue subsequent steps
    delays.slice(1).forEach((delay, i) => {
      timers.current.push(
        setTimeout(() => setStep(i + 1), delay),
      );
    });

    return () => {
      timers.current.forEach(clearTimeout);
    };
  }, [active]); // eslint-disable-line react-hooks/exhaustive-deps

  return step;
}

export default ProcessingTimeline;
