import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useEffect, useState } from "react";
import { Link } from "wouter";
import {
  Crown, Check, CreditCard, AlertTriangle, ArrowRight,
  CheckCircle2, XCircle, Clock, Zap, ExternalLink,
} from "lucide-react";
import { BG, CARD, GOLD, GOLD_BORDER, BORDER, MUTED, DIM } from "@/lib/design";

// ── helpers ───────────────────────────────────────────────────
type Status = "free" | "active" | "past_due" | "canceled" | "trialing" | (string & {});

function statusLabel(s: Status) {
  switch (s) {
    case "active":   return "Active";
    case "trialing": return "Trial";
    case "past_due": return "Payment past due";
    case "canceled": return "Canceled";
    default:         return "Free";
  }
}

function StatusBadge({ status }: { status: Status }) {
  const cfg: Record<string, { bg: string; border: string; color: string; icon: React.ReactNode }> = {
    active:   { bg: "rgba(34,197,94,0.1)",  border: "rgba(34,197,94,0.3)",   color: "#4ade80", icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
    trialing: { bg: "rgba(34,197,94,0.1)",  border: "rgba(34,197,94,0.3)",   color: "#4ade80", icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
    past_due: { bg: "rgba(234,179,8,0.1)",  border: "rgba(234,179,8,0.3)",   color: "#facc15", icon: <Clock className="w-3.5 h-3.5" /> },
    canceled: { bg: "rgba(239,68,68,0.1)",  border: "rgba(239,68,68,0.25)",  color: "#f87171", icon: <XCircle className="w-3.5 h-3.5" /> },
    free:     { bg: "rgba(255,255,255,0.05)", border: "rgba(255,255,255,0.1)", color: MUTED,   icon: <Zap className="w-3.5 h-3.5" /> },
  };
  const c = cfg[status as string] ?? cfg.free;
  return (
    <span
      className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border"
      style={{ background: c.bg, borderColor: c.border, color: c.color }}
      data-testid="badge-subscription-status"
    >
      {c.icon}
      {statusLabel(status)}
    </span>
  );
}

const PRO_FEATURES = [
  "Save unlimited reports",
  "Download professional PDFs",
  "Access all previous reports",
  "Net worth statements",
  "Income strategy analysis",
  "Share with your accountant",
];

// ── page ──────────────────────────────────────────────────────
export default function Billing() {
  const { user } = useAuth();
  const { toast } = useToast();
  const status = (user?.subscriptionStatus ?? "free") as Status;
  const isPro = status === "active" || status === "trialing";
  const isPastDue = status === "past_due";
  const isCanceled = status === "canceled";
  const planType = (user as any)?.planType as string | null | undefined;
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    document.title = "Billing — adavi.ai";
    const p = new URLSearchParams(window.location.search);
    if (p.get("checkout") === "success") {
      setShowSuccess(true);
      window.history.replaceState({}, "", "/billing");
    }
  }, []);

  // ── mutations ─────────────────────────────────────────────
  const portalMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/billing/portal");
      return res.json() as Promise<{ url?: string; error?: string }>;
    },
    onSuccess: (data) => {
      if (data?.url) { window.location.href = data.url; return; }
      toast({ title: "Billing portal unavailable", description: "Please try again or contact support.", variant: "destructive" });
    },
    onError: () => toast({ title: "Unable to open billing portal", variant: "destructive" }),
  });

  const checkoutMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/create-checkout-session", { plan: "monthly" });
      return res.json() as Promise<{ url?: string; configured?: boolean; error?: string }>;
    },
    onSuccess: (data) => {
      if (data?.url) { window.location.href = data.url; return; }
      if (data?.configured === false) {
        toast({ title: "Payments unavailable", description: "Payments are temporarily unavailable. Please try again later.", variant: "destructive" });
        return;
      }
      toast({ title: "Something went wrong", description: "Unable to start checkout. Please try again.", variant: "destructive" });
    },
    onError: () => toast({ title: "Something went wrong", description: "Please try again or contact support.", variant: "destructive" }),
  });

  const isPortalBusy = portalMutation.isPending;

  return (
    <AppLayout>
      <div className="container mx-auto px-4 py-10 max-w-2xl">

        {/* Page header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white" data-testid="heading-billing">Billing</h1>
          <p className="text-sm mt-1" style={{ color: MUTED }}>
            Manage your subscription and payment details.
          </p>
        </div>

        {/* ── Success banner (after checkout redirect) ──────── */}
        {showSuccess && (
          <div
            className="rounded-2xl border p-5 mb-6 flex items-start gap-3"
            style={{ background: "rgba(34,197,94,0.08)", borderColor: "rgba(34,197,94,0.3)" }}
            data-testid="banner-checkout-success"
          >
            <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5 text-green-400" />
            <div>
              <p className="font-semibold text-white">Welcome to Premium!</p>
              <p className="text-sm mt-0.5" style={{ color: MUTED }}>
                Your subscription is now active. All Premium features are unlocked.
              </p>
            </div>
          </div>
        )}

        {/* ── Past-due warning ──────────────────────────────── */}
        {isPastDue && (
          <div
            className="rounded-2xl border p-5 mb-6 flex items-start gap-3"
            style={{ background: "rgba(234,179,8,0.07)", borderColor: "rgba(234,179,8,0.3)" }}
            data-testid="banner-past-due"
          >
            <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5 text-yellow-400" />
            <div className="flex-1">
              <p className="font-semibold text-white">Payment failed</p>
              <p className="text-sm mt-0.5" style={{ color: MUTED }}>
                We couldn't charge your card. Update your payment method to keep Premium access.
              </p>
            </div>
            <Button
              size="sm"
              className="shrink-0 font-semibold"
              style={{ background: GOLD, color: BG }}
              onClick={() => portalMutation.mutate()}
              disabled={isPortalBusy}
              data-testid="button-fix-payment"
            >
              {isPortalBusy ? "Opening…" : "Fix Payment"}
            </Button>
          </div>
        )}

        {/* ── Canceled notice ───────────────────────────────── */}
        {isCanceled && !showSuccess && (
          <div
            className="rounded-2xl border p-5 mb-6 flex items-start gap-3"
            style={{ background: "rgba(239,68,68,0.07)", borderColor: "rgba(239,68,68,0.25)" }}
            data-testid="banner-canceled"
          >
            <XCircle className="w-5 h-5 shrink-0 mt-0.5 text-red-400" />
            <div>
              <p className="font-semibold text-white">Subscription canceled</p>
              <p className="text-sm mt-0.5" style={{ color: MUTED }}>
                Your Premium features have ended. Re-subscribe anytime to restore access.
              </p>
            </div>
          </div>
        )}

        {/* ── Current plan card ─────────────────────────────── */}
        <div
          className="rounded-2xl border p-6 mb-6"
          style={{
            background: CARD,
            borderColor: isPro ? GOLD_BORDER : isPastDue ? "rgba(234,179,8,0.3)" : BORDER,
            boxShadow: isPro ? "0 0 40px rgba(197,163,90,0.08)" : "none",
          }}
        >
          {/* Plan header */}
          <div className="flex items-start justify-between gap-4 mb-6">
            <div className="flex items-center gap-3">
              <div
                className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: isPro ? "rgba(197,163,90,0.15)" : "rgba(255,255,255,0.05)" }}
              >
                {isPro
                  ? <Crown className="w-5 h-5" style={{ color: GOLD }} />
                  : <Zap className="w-5 h-5" style={{ color: MUTED }} />}
              </div>
              <div>
                <p className="font-bold text-white text-lg leading-tight" data-testid="text-plan-name">
                  {isPro ? "Premium" : isCanceled ? "Canceled" : "Free"} Plan
                </p>
                {isPro && planType && (
                  <p className="text-xs mt-0.5 capitalize" style={{ color: MUTED }}>
                    Billed {planType === "annual" ? "annually" : "monthly"}
                    {planType === "monthly" && " · $8.99/mo"}
                    {planType === "annual" && " · $89/yr"}
                  </p>
                )}
              </div>
            </div>
            <StatusBadge status={status} />
          </div>

          {/* Divider */}
          <div className="h-px mb-5" style={{ background: BORDER }} />

          {/* Features / upsell */}
          {isPro ? (
            <div className="grid grid-cols-2 gap-2 mb-6">
              {PRO_FEATURES.map(f => (
                <div key={f} className="flex items-center gap-2 text-sm text-white">
                  <Check className="w-3.5 h-3.5 shrink-0" style={{ color: GOLD }} />
                  {f}
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-2 mb-6">
              <p className="text-sm font-medium text-white">
                {isCanceled ? "Re-subscribe to unlock:" : "Upgrade to unlock:"}
              </p>
              {PRO_FEATURES.map(f => (
                <div key={f} className="flex items-center gap-2 text-sm" style={{ color: MUTED }}>
                  <Check className="w-3.5 h-3.5 shrink-0" style={{ color: GOLD }} />
                  {f}
                </div>
              ))}
            </div>
          )}

          {/* Action buttons */}
          {isPro ? (
            <div className="flex gap-3">
              <Button
                className="flex-1 font-semibold"
                style={{ background: GOLD, color: BG }}
                onClick={() => portalMutation.mutate()}
                disabled={isPortalBusy}
                data-testid="button-manage-subscription"
              >
                <CreditCard className="w-4 h-4 mr-1.5" />
                {isPortalBusy ? "Opening Stripe…" : "Manage Subscription"}
                {!isPortalBusy && <ExternalLink className="w-3.5 h-3.5 ml-1.5 opacity-60" />}
              </Button>
              <Button
                variant="outline"
                className="border font-medium hover:bg-white/5"
                style={{ borderColor: BORDER, color: MUTED }}
                onClick={() => portalMutation.mutate()}
                disabled={isPortalBusy}
                data-testid="button-cancel-subscription"
              >
                Cancel Plan
              </Button>
            </div>
          ) : isPastDue ? (
            <Button
              className="w-full font-bold h-11"
              style={{ background: GOLD, color: BG }}
              onClick={() => portalMutation.mutate()}
              disabled={isPortalBusy}
              data-testid="button-update-payment"
            >
              <CreditCard className="w-4 h-4 mr-2" />
              {isPortalBusy ? "Opening Stripe…" : "Update Payment Method"}
            </Button>
          ) : (
            <Button
              className="w-full font-bold h-11 text-base"
              style={{ background: GOLD, color: BG }}
              onClick={() => checkoutMutation.mutate()}
              disabled={checkoutMutation.isPending}
              data-testid="button-upgrade-billing"
            >
              <Crown className="w-4 h-4 mr-2" />
              {checkoutMutation.isPending
                ? "Redirecting to Stripe…"
                : isCanceled
                  ? "Re-subscribe — $8.99/mo"
                  : "Upgrade to Premium — $8.99/mo"}
              {!checkoutMutation.isPending && <ArrowRight className="w-4 h-4 ml-2" />}
            </Button>
          )}
        </div>

        {/* ── Quick links ───────────────────────────────────── */}
        <div
          className="rounded-2xl border p-5 flex items-center justify-between"
          style={{ background: CARD, borderColor: BORDER }}
        >
          <div>
            <p className="text-sm font-medium text-white">Need help?</p>
            <p className="text-xs mt-0.5" style={{ color: DIM }}>
              Questions about invoices, upgrades, or cancellations.
            </p>
          </div>
          <div className="flex gap-3">
            <Link href="/pricing">
              <Button
                variant="outline"
                size="sm"
                className="border hover:bg-white/5 text-xs font-medium"
                style={{ borderColor: BORDER, color: MUTED }}
                data-testid="link-view-pricing"
              >
                View Plans
              </Button>
            </Link>
            <a href="mailto:adavi@adavi.ai">
              <Button
                variant="outline"
                size="sm"
                className="border hover:bg-white/5 text-xs font-medium"
                style={{ borderColor: BORDER, color: MUTED }}
                data-testid="link-contact-support"
              >
                Contact Support
              </Button>
            </a>
          </div>
        </div>

        <p className="text-center text-xs mt-6" style={{ color: DIM }}>
          Secure payments by Stripe. Cancel anytime — no questions asked.
        </p>

      </div>
    </AppLayout>
  );
}
