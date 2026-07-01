/**
 * SignupGateModal
 *
 * Shown when an unauthenticated user tries to perform a protected action
 * (e.g. upload a document, save a statement).
 *
 * Usage:
 *   const [showGate, setShowGate] = useState(false);
 *   <SignupGateModal open={showGate} onClose={() => setShowGate(false)} />
 */

import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Lock, X } from "lucide-react";
import { SiGoogle } from "react-icons/si";
import { BG, CARD, GOLD, GOLD_BORDER, BORDER, MUTED, DIM } from "@/lib/design";

interface Props {
  open: boolean;
  onClose: () => void;
  /**
   * Optional headline — defaults to "Create a Free Account to Continue"
   */
  title?: string;
  /**
   * Optional subtext — defaults to upload-specific copy
   */
  description?: string;
}

export function SignupGateModal({
  open,
  onClose,
  title = "Create a Free Account to Continue",
  description = "Sign up to upload your documents and build your net worth statement.",
}: Props) {
  const { data: providers } = useQuery<{ google: boolean }>({
    queryKey: ["/api/auth/providers"],
    staleTime: Infinity,
  });

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
      style={{ background: "rgba(0,0,0,0.75)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      data-testid="signup-gate-modal"
    >
      <div
        className="relative rounded-2xl border p-8 w-full max-w-sm text-center shadow-2xl"
        style={{ background: CARD, borderColor: GOLD_BORDER }}
      >
        {/* Dismiss */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 rounded-lg p-1.5 transition-colors"
          style={{ color: DIM }}
          onMouseEnter={e => (e.currentTarget.style.color = "white")}
          onMouseLeave={e => (e.currentTarget.style.color = DIM)}
          data-testid="button-close-signup-gate"
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Icon */}
        <div
          className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4"
          style={{ background: "rgba(197,163,90,0.15)" }}
        >
          <Lock className="w-6 h-6" style={{ color: GOLD }} />
        </div>

        <h3 className="text-xl font-bold text-white mb-2">{title}</h3>
        <p className="text-sm mb-6" style={{ color: MUTED }}>{description}</p>

        <div className="space-y-3">
          {/* Google — only shown when OAuth is configured */}
          {providers?.google && (
            <a href="/api/auth/google" data-testid="button-google-gate">
              <Button
                className="w-full h-11 flex items-center justify-center gap-2.5 font-semibold"
                style={{ background: "rgba(255,255,255,0.08)", color: "white", border: `1px solid ${BORDER}` }}
              >
                <SiGoogle className="w-4 h-4 text-[#4285F4]" />
                Continue with Google
              </Button>
            </a>
          )}

          {/* Create Account */}
          <Link href="/signup" data-testid="button-create-account-gate">
            <Button
              className="w-full h-11 font-bold"
              style={{ background: GOLD, color: BG }}
            >
              Create Free Account
            </Button>
          </Link>

          {/* Log In */}
          <Link href="/login" data-testid="button-login-gate">
            <Button
              variant="ghost"
              className="w-full h-11 font-medium"
              style={{ color: "rgba(255,255,255,0.6)" }}
            >
              Log In
            </Button>
          </Link>
        </div>

        <button
          onClick={onClose}
          className="text-xs mt-4 block mx-auto transition-colors"
          style={{ color: DIM }}
          onMouseEnter={e => (e.currentTarget.style.color = MUTED)}
          onMouseLeave={e => (e.currentTarget.style.color = DIM)}
          data-testid="button-maybe-later"
        >
          Maybe later
        </button>
      </div>
    </div>
  );
}
