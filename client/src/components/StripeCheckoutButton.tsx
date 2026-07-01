import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Zap, Loader2, Lock } from "lucide-react";

interface Props {
  plan: "monthly" | "annual";
  label?: string;
  className?: string;
  "data-testid"?: string;
}

export function StripeCheckoutButton({ plan, label, className, "data-testid": testId }: Props) {
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function handleCheckout() {
    setLoading(true);
    setErrorMsg(null);
    try {
      // Use raw fetch — apiRequest throws on non-2xx which prevents
      // us from distinguishing "not configured yet" (503) from real errors.
      const res = await fetch("/api/create-checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ plan }),
      });

      const data = await res.json();

      if (data.url) {
        window.location.href = data.url;
        return;
      }

      // 503 = billing env vars not yet configured
      if (res.status === 503 || data.configured === false) {
        setErrorMsg("Billing is being finalized. Please try again shortly or contact support.");
        return;
      }

      // Any other non-success
      setErrorMsg("Checkout is temporarily unavailable. Please try again shortly.");
    } catch {
      setErrorMsg("Checkout is temporarily unavailable. Please try again shortly.");
    } finally {
      setLoading(false);
    }
  }

  const defaultLabel = plan === "annual" ? "Get Annual Plan" : "Start Pro Free";

  return (
    <div className="w-full space-y-2.5">
      <Button
        onClick={handleCheckout}
        disabled={loading}
        className={className}
        data-testid={testId ?? `button-stripe-checkout-${plan}`}
      >
        {loading ? (
          <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Starting checkout…</>
        ) : (
          <><Zap className="w-4 h-4 mr-2" />{label ?? defaultLabel}</>
        )}
      </Button>

      {errorMsg && (
        <div
          role="alert"
          className="flex items-start gap-2.5 bg-[#FDF8EE] border border-[#D4B870]/50 rounded-xl px-4 py-3 text-sm text-[#3F4A5A]"
        >
          <Lock className="w-4 h-4 text-[#9A6A1F] shrink-0 mt-0.5" aria-hidden="true" />
          <p>{errorMsg}</p>
        </div>
      )}
    </div>
  );
}
