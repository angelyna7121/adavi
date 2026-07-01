import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Zap, ArrowRight, CheckCircle2 } from "lucide-react";
import { analytics } from "@/lib/analytics";

const BG = "#0D1929";
const CARD = "#16233B";
const GOLD = "#C5A35A";
const BORDER = "rgba(197,163,90,0.25)";
const MUTED = "rgba(255,255,255,0.45)";

const PROVINCES = ["AB","BC","MB","NB","NL","NS","NT","NU","ON","PE","QC","SK","YT"];
const PROVINCE_NAMES: Record<string,string> = {
  AB:"Alberta",BC:"British Columbia",MB:"Manitoba",NB:"New Brunswick",
  NL:"Newfoundland & Labrador",NS:"Nova Scotia",NT:"Northwest Territories",
  NU:"Nunavut",ON:"Ontario",PE:"Prince Edward Island",QC:"Quebec",SK:"Saskatchewan",YT:"Yukon",
};
const BUSINESS_TYPES = [
  "Consulting / Freelance","Medical / Healthcare","Legal","Accounting / Finance",
  "Engineering / Tech","Real Estate","Creative / Design","Other",
];
const INCOME_RANGES = ["Under $100k","$100k – $200k","$200k – $400k","$400k – $1M","Over $1M"];

export default function Onboarding() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const [province, setProvince] = useState("ON");
  const [businessType, setBusinessType] = useState("");
  const [incomeRange, setIncomeRange] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    analytics.track("onboarding_started");
    fetch("/api/onboarding", { credentials: "include" })
      .then(r => r.json())
      .then(profile => { if (profile?.onboardingCompleted) navigate("/dashboard"); });
  }, [user]);

  async function handleComplete() {
    setSaving(true);
    try {
      await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ businessType, province, incomeRange }),
      });
    } catch {}
    navigate("/dashboard");
  }

  const firstName = user?.email?.split("@")[0] ?? "there";

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12" style={{ background: BG }}>
      <div className="w-full max-w-md">
        <div className="flex items-center justify-center gap-2.5 mb-8">
          <div className="p-2 rounded-xl" style={{ background: GOLD }}>
            <Zap className="w-5 h-5" style={{ color: BG }} />
          </div>
          <span className="text-2xl font-bold text-white">adavi.ai</span>
        </div>

        <div className="rounded-2xl p-8 border" style={{ background: CARD, borderColor: BORDER }}>
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-white mb-1.5">Welcome, {firstName}!</h1>
            <p className="text-sm" style={{ color: MUTED }}>
              Help us personalize your experience. All fields are optional.
            </p>
          </div>

          <div className="space-y-5">
            <div className="space-y-2">
              <Label className="text-sm font-medium text-white/70">Province of incorporation</Label>
              <Select value={province} onValueChange={setProvince}>
                <SelectTrigger className="border text-white" style={{ background: "rgba(255,255,255,0.05)", borderColor: BORDER }} data-testid="select-province">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PROVINCES.map(p => <SelectItem key={p} value={p} data-testid={`option-province-${p}`}>{PROVINCE_NAMES[p]} ({p})</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium text-white/70">Type of business <span style={{ color: MUTED }}>(optional)</span></Label>
              <Select value={businessType} onValueChange={setBusinessType}>
                <SelectTrigger className="border text-white" style={{ background: "rgba(255,255,255,0.05)", borderColor: BORDER }} data-testid="select-business-type">
                  <SelectValue placeholder="Select your industry" />
                </SelectTrigger>
                <SelectContent>
                  {BUSINESS_TYPES.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium text-white/70">Expected annual revenue <span style={{ color: MUTED }}>(optional)</span></Label>
              <Select value={incomeRange} onValueChange={setIncomeRange}>
                <SelectTrigger className="border text-white" style={{ background: "rgba(255,255,255,0.05)", borderColor: BORDER }} data-testid="select-income-range">
                  <SelectValue placeholder="Select a range" />
                </SelectTrigger>
                <SelectContent>
                  {INCOME_RANGES.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="mt-6 pt-6 space-y-2" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
            <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: MUTED }}>What's next</p>
            {["Build your net worth statement", "Run your income strategy analysis", "Download professional PDF reports"].map(s => (
              <div key={s} className="flex items-center gap-2 text-sm" style={{ color: MUTED }}>
                <CheckCircle2 className="w-4 h-4 shrink-0" style={{ color: GOLD }} />
                {s}
              </div>
            ))}
          </div>

          <div className="flex gap-3 mt-7">
            <Button
              onClick={handleComplete}
              disabled={saving}
              className="flex-1 h-11 font-bold"
              style={{ background: GOLD, color: BG }}
              data-testid="button-onboarding-continue"
            >
              {saving ? "Saving…" : "Let's go"}
              <ArrowRight className="w-4 h-4 ml-1.5" />
            </Button>
            <Button
              variant="ghost"
              onClick={() => navigate("/dashboard")}
              className="text-white/40 hover:text-white/70"
              data-testid="button-onboarding-skip"
            >
              Skip
            </Button>
          </div>
        </div>

        <p className="text-center text-xs mt-5" style={{ color: MUTED }}>
          Your information is private and never shared.
        </p>
      </div>
    </div>
  );
}
