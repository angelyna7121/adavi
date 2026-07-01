/**
 * client/src/components/ErrorBoundary.tsx
 *
 * React error boundary — catches render-time errors in the component tree.
 * Shows a friendly, design-system-consistent fallback. Never exposes raw
 * error messages, stack traces, or developer details.
 *
 * Usage:
 *   <ErrorBoundary>
 *     <YourPage />
 *   </ErrorBoundary>
 *
 *   // With a custom fallback:
 *   <ErrorBoundary fallback={<p>Custom message</p>}>
 *     ...
 *   </ErrorBoundary>
 */

import { Component, type ReactNode, type ErrorInfo } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GOLD, CARD, BORDER } from "@/lib/design";

// ── Props & State ─────────────────────────────────────────────────────────────

type Props = {
  children: ReactNode;
  fallback?: ReactNode;
};

type State = {
  hasError: boolean;
};

// ── Component ─────────────────────────────────────────────────────────────────

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    // Log internally only — never surface to the user
    console.error("[ErrorBoundary] Caught render error:", error.message);
    console.error("[ErrorBoundary] Component stack:", info.componentStack);
  }

  handleReset = (): void => {
    this.setState({ hasError: false });
  };

  render(): ReactNode {
    if (!this.state.hasError) return this.props.children;

    if (this.props.fallback) return this.props.fallback;

    return (
      <div
        style={{ background: CARD, border: `1px solid ${BORDER}` }}
        className="rounded-xl p-8 mx-auto max-w-md text-center space-y-4"
      >
        <div
          className="w-12 h-12 rounded-full flex items-center justify-center mx-auto"
          style={{ background: "rgba(197,163,90,0.12)" }}
        >
          <AlertTriangle style={{ color: GOLD }} className="w-6 h-6" />
        </div>

        <div className="space-y-1">
          <h3 className="text-white font-semibold text-lg">Something went wrong</h3>
          <p className="text-sm" style={{ color: "#9CA3AF" }}>
            An unexpected error occurred. Please refresh the page or try again.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={this.handleReset}
          className="gap-2"
          data-testid="button-error-retry"
        >
          <RefreshCw className="w-4 h-4" />
          Try again
        </Button>
      </div>
    );
  }
}

// ── Inline error message (for non-boundary use) ───────────────────────────────

type ErrorMessageProps = {
  message?: string | null;
  className?: string;
};

export function ErrorMessage({ message, className = "" }: ErrorMessageProps) {
  if (!message) return null;

  return (
    <div
      className={`flex items-start gap-2 rounded-lg p-3 text-sm ${className}`}
      style={{
        background: "rgba(239,68,68,0.10)",
        border: "1px solid rgba(239,68,68,0.25)",
        color: "#FCA5A5",
      }}
      role="alert"
      data-testid="status-error-message"
    >
      <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0 text-red-400" />
      <span>{message}</span>
    </div>
  );
}
