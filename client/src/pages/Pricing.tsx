import { AppLayout } from "@/components/layout/AppLayout";
import { Link } from "wouter";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Check, Crown, Zap, ArrowRight, Lock } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { BG, CARD, GOLD, GOLD_BORDER, BORDER, MUTED, DIM } from "@/lib/design";


const PRO_FEATURES = [
  "Save unlimited reports",
  "Download professional PDFs",
  "Access all previous reports",
  "Create net worth statements",
  "Create income strategies",
  "Share with your accountant",
];

const FREE_FEATURES = [
  "Unlimited net worth calculations",
  "Unlimited income strategy analyses",
  "No account required",
];

export default function Pricing() {
  const { user } = useAuth();
  const { toast } = useToast();
  const isPro = user?.subscriptionStatus === "active" || user?.subscriptionStatus === "trialing";

  useEffect(() => {
    document.title = "Pricing — adavi.ai";
  }, []);

  const checkout = useMutation({
    mutationFn: async (plan: "monthly" | "annual") => {
      const res = await apiRequest("POST", "/api/create-checkout-session", { plan });
      return res.json() as Promise<{ url?: string; configured?: boolean; error?: string }>;
    },
    onSuccess: (data) => {
      if (data?.url) { window.location.href = data.url; return; }
      if (data?.configured === false) {
        toast({ title: "Payments unavailable", description: "Payments are temporarily unavailable. Please try again later.", variant: "destructive" });
      }
    },
    onError: () => toast({ title: "Something went wrong", description: "Please try again or contact support.", variant: "destructive" }),
  });

  const handleUpgrade = (plan: "monthly" | "annual" = "monthly") => {
    if (!user) { window.location.href = "/signup"; return; }
    checkout.mutate(plan);
  };

  return (
    <AppLayout>
      <div className="container mx-auto px-4 py-16 max-w-4xl">

        {/* Header */}
        <div className="text-center mb-14">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border mb-5 text-xs font-semibold" style={{ background: "rgba(197,163,90,0.08)", borderColor: GOLD_BORDER, color: GOLD }}>
            <Crown className="w-3.5 h-3.5" />
            Simple pricing
          </div>
          <h1 className="text-4xl font-bold text-white mb-4">One plan, everything included</h1>
          <p className="text-lg max-w-md mx-auto" style={{ color: MUTED }}>Start free, upgrade when you're ready to save and download your reports.</p>
        </div>

        <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto">

          {/* Free card */}
          <div className="rounded-2xl border p-8 flex flex-col" style={{ background: CARD, borderColor: BORDER }}>
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-4">
                <Zap className="w-5 h-5" style={{ color: MUTED }} />
                <p className="font-bold text-white">Free Forever</p>
              </div>
              <p className="text-4xl font-bold text-white mb-1">$0</p>
              <p className="text-sm" style={{ color: MUTED }}>No credit card required</p>
            </div>
            <div className="flex-1 space-y-3 mb-8">
              {FREE_FEATURES.map(f => (
                <div key={f} className="flex items-center gap-2.5 text-sm" style={{ color: MUTED }}>
                  <Check className="w-4 h-4 shrink-0" style={{ color: MUTED }} />
                  {f}
                </div>
              ))}
              <div className="flex items-center gap-2.5 text-sm" style={{ color: DIM }}>
                <Lock className="w-4 h-4 shrink-0" />
                Save &amp; download reports
              </div>
              <div className="flex items-center gap-2.5 text-sm" style={{ color: DIM }}>
                <Lock className="w-4 h-4 shrink-0" />
                PDF exports
              </div>
            </div>
            {user ? (
              <div className="text-center text-sm py-3 rounded-xl border font-medium" style={{ color: MUTED, borderColor: BORDER }}>
                Your current plan
              </div>
            ) : (
              <Link href="/signup">
                <Button variant="outline" className="w-full text-white/70 border hover:bg-white/5 hover:text-white font-semibold" style={{ borderColor: BORDER }} data-testid="button-free-signup">
                  Get Started Free
                </Button>
              </Link>
            )}
          </div>

          {/* Premium card */}
          <div
            className="rounded-2xl border p-8 flex flex-col relative overflow-hidden"
            style={{ background: CARD, borderColor: GOLD, boxShadow: "0 0 60px rgba(197,163,90,0.15), 0 0 120px rgba(197,163,90,0.05)" }}
          >
            <div className="absolute top-0 right-0 left-0 h-px" style={{ background: `linear-gradient(90deg, transparent, ${GOLD}, transparent)` }} />
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-4">
                <Crown className="w-5 h-5" style={{ color: GOLD }} />
                <p className="font-bold text-white">Premium Plan</p>
                <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: "rgba(197,163,90,0.15)", color: GOLD }}>RECOMMENDED</span>
              </div>
              <p className="text-4xl font-bold text-white mb-0.5">$8.99<span className="text-xl font-normal" style={{ color: MUTED }}>/month</span></p>
              <p className="text-sm" style={{ color: MUTED }}>Cancel anytime</p>
            </div>
            <div className="flex-1 space-y-3 mb-8">
              {PRO_FEATURES.map(f => (
                <div key={f} className="flex items-center gap-2.5 text-sm text-white">
                  <Check className="w-4 h-4 shrink-0" style={{ color: GOLD }} />
                  {f}
                </div>
              ))}
            </div>
            {isPro ? (
              <Link href="/billing">
                <Button className="w-full font-bold" style={{ background: GOLD, color: BG }} data-testid="button-manage-billing">
                  Manage Subscription
                </Button>
              </Link>
            ) : (
              <Button
                className="w-full font-bold h-12 text-base"
                style={{ background: GOLD, color: BG }}
                onClick={() => handleUpgrade("monthly")}
                disabled={checkout.isPending}
                data-testid="button-start-premium"
              >
                {checkout.isPending ? "Redirecting…" : <><Crown className="w-4 h-4 mr-2" />Start Premium</>}
              </Button>
            )}
            <p className="text-center text-xs mt-3" style={{ color: DIM }}>Secure checkout powered by Stripe</p>
          </div>
        </div>

        {/* FAQ / disclaimer */}
        <div className="text-center mt-14">
          <p className="text-sm" style={{ color: DIM }}>
            Questions? Email us at{" "}
            <a href="mailto:adavi@adavi.ai" className="hover:text-white underline" style={{ color: MUTED }}>adavi@adavi.ai</a>
          </p>
          <p className="text-xs mt-3" style={{ color: DIM }}>
            Educational estimates only. Not tax, legal, accounting, or investment advice.
          </p>
        </div>
      </div>
    </AppLayout>
  );
}
