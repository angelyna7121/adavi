import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { X, Crown, Check, Save, FileText, History, Share2 } from "lucide-react";
import { BG, CARD, GOLD, GOLD_BORDER, BORDER, MUTED, DIM } from "@/lib/design";

interface Props {
  open: boolean;
  onClose: () => void;
}

const FEATURES = [
  { icon: Save,     text: "Save unlimited net worth statements" },
  { icon: History,  text: "Track your net worth over time" },
  { icon: FileText, text: "Export professional PDF reports for your accountant" },
  { icon: Share2,   text: "Share a read-only link with your advisor" },
];

export function NetWorthUpgradeModal({ open, onClose }: Props) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
      style={{ background: "rgba(0,0,0,0.80)" }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      data-testid="net-worth-upgrade-modal"
    >
      <div
        className="relative rounded-2xl border w-full max-w-md overflow-hidden shadow-2xl"
        style={{ background: CARD, borderColor: GOLD_BORDER, boxShadow: "0 0 60px rgba(197,163,90,0.18)" }}
      >
        {/* Gold header band */}
        <div
          className="px-8 pt-8 pb-6 text-center"
          style={{ background: "rgba(197,163,90,0.07)", borderBottom: `1px solid ${GOLD_BORDER}` }}
        >
          <button
            onClick={onClose}
            className="absolute top-4 right-4 rounded-lg p-1.5 transition-colors"
            style={{ color: DIM }}
            onMouseEnter={e => (e.currentTarget.style.color = "white")}
            onMouseLeave={e => (e.currentTarget.style.color = DIM)}
            data-testid="button-close-upgrade-modal"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>

          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
            style={{ background: "rgba(197,163,90,0.15)", border: `1px solid ${GOLD_BORDER}` }}
          >
            <Crown className="w-7 h-7" style={{ color: GOLD }} />
          </div>

          <h3 className="text-2xl font-extrabold text-white mb-2">
            Save Your Net Worth Statement
          </h3>
          <p className="text-sm" style={{ color: MUTED }}>
            Upgrade to Premium to save, track, and export your statement as a professional PDF.
          </p>
        </div>

        {/* Feature list */}
        <div className="px-8 py-6">
          <ul className="space-y-3.5 mb-6">
            {FEATURES.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-3">
                <div
                  className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                  style={{ background: "rgba(197,163,90,0.10)" }}
                >
                  <Icon className="w-3.5 h-3.5" style={{ color: GOLD }} />
                </div>
                <span className="text-sm text-white">{text}</span>
              </li>
            ))}
          </ul>

          {/* Price callout */}
          <div
            className="rounded-xl border p-4 mb-5 flex items-center justify-between"
            style={{ background: "rgba(197,163,90,0.06)", borderColor: GOLD_BORDER }}
          >
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest mb-0.5" style={{ color: GOLD }}>Premium</p>
              <p className="text-white text-sm">Billed monthly or annually</p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-extrabold" style={{ color: GOLD }}>$8.99</p>
              <p className="text-xs" style={{ color: DIM }}>/month</p>
            </div>
          </div>

          {/* CTAs */}
          <div className="space-y-3">
            <Link href="/pricing" onClick={onClose} data-testid="button-upgrade-cta">
              <Button
                className="w-full h-12 text-base font-bold gap-2"
                style={{ background: GOLD, color: BG }}
              >
                <Crown className="w-4 h-4" />
                Upgrade to Premium
              </Button>
            </Link>
            <button
              onClick={onClose}
              className="w-full text-sm py-2 transition-colors"
              style={{ color: DIM }}
              onMouseEnter={e => (e.currentTarget.style.color = MUTED)}
              onMouseLeave={e => (e.currentTarget.style.color = DIM)}
              data-testid="button-upgrade-maybe-later"
            >
              Maybe later
            </button>
          </div>
        </div>

        {/* Disclaimer */}
        <p className="text-center text-xs pb-5" style={{ color: DIM }}>
          Cancel anytime · No hidden fees
        </p>
      </div>
    </div>
  );
}
