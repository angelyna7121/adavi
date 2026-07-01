import { AppLayout } from "@/components/layout/AppLayout";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/use-auth";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import {
  TrendingUp, ArrowRight, ArrowLeft, Check, Star, Download, Save,
  Lock, Crown, Info, AlertTriangle, RefreshCw,
} from "lucide-react";
import { calculateFinancials, optimizeCompensation, formatCurrency } from "@/lib/financialCalcs";
import { BG, CARD, GOLD, GOLD_BORDER, BORDER, MUTED, DIM } from "@/lib/design";
import { NetWorthUpgradeModal } from "@/components/NetWorthUpgradeModal";

// ─── Constants ────────────────────────────────────────────────────────────────

const PROVINCES = [
  { value: "ON", label: "Ontario" },
  { value: "BC", label: "British Columbia" },
  { value: "AB", label: "Alberta" },
  { value: "QC", label: "Quebec" },
  { value: "SK", label: "Saskatchewan" },
  { value: "MB", label: "Manitoba" },
  { value: "NS", label: "Nova Scotia" },
  { value: "NB", label: "New Brunswick" },
  { value: "PE", label: "PEI" },
  { value: "NL", label: "Newfoundland" },
];

type Inputs = {
  province: string;
  corporateProfit: string;
  desiredWithdrawal: string;
  gripKnown: "yes" | "no" | "not_sure";
  gripAmount: string;
  wantsCppRrsp: "yes" | "no" | "not_sure";
  preferSimple: "yes" | "no";
};

const DEFAULT_INPUTS: Inputs = {
  province: "ON",
  corporateProfit: "",
  desiredWithdrawal: "",
  gripKnown: "not_sure",
  gripAmount: "",
  wantsCppRrsp: "not_sure",
  preferSimple: "no",
};

type WizardStep = 1 | 2 | 3 | 4;

// ─── Calculation ──────────────────────────────────────────────────────────────

function computeResults(inputs: Inputs) {
  const profit = Math.max(0, parseFloat(inputs.corporateProfit) || 0);
  const withdrawal = Math.max(0, parseFloat(inputs.desiredWithdrawal) || profit);
  if (profit <= 0) return null;

  const salary100 = Math.min(withdrawal, profit);
  const salaryOption = calculateFinancials({ revenue: profit, expenses: 0, salary: salary100 });
  const dividendOption = calculateFinancials({ revenue: profit, expenses: 0, salary: 0 });
  const optimized = optimizeCompensation(profit, 0);
  const blendedSalary = Math.min(optimized?.recommendedSalary ?? 0, profit);
  const blendedOption = calculateFinancials({ revenue: profit, expenses: 0, salary: blendedSalary });

  let recommendedSalary = blendedSalary;
  let recommendationReason = "Optimized for maximum after-tax personal cash.";

  if (inputs.wantsCppRrsp === "yes") {
    const targetSalary = Math.min(73200, profit * 0.6);
    recommendedSalary = Math.max(blendedSalary, targetSalary);
    recommendedSalary = Math.min(recommendedSalary, withdrawal);
    recommendationReason = "Salary set to generate RRSP room and CPP contributions alongside tax-efficient dividends.";
  } else if (inputs.wantsCppRrsp === "no") {
    recommendedSalary = Math.min(blendedSalary * 0.5, 30000);
    recommendedSalary = Math.max(0, recommendedSalary);
    recommendationReason = "Lower salary reduces CPP contributions. Maximizes after-tax dividend income.";
  } else if (inputs.preferSimple === "yes") {
    recommendedSalary = Math.min(Math.round(profit * 0.5), withdrawal);
    recommendationReason = "A balanced 50/50 split for simplicity — easy to understand and administer.";
  }

  const recommended = calculateFinancials({ revenue: profit, expenses: 0, salary: recommendedSalary });
  const gripAmt = parseFloat(inputs.gripAmount) || 0;
  const gripWarning = inputs.gripKnown === "yes" && gripAmt > 0 && (recommended.dividends ?? 0) > gripAmt;
  const gripUnknownNote = inputs.gripKnown !== "yes";

  return {
    profit, withdrawal,
    salaryOption:   { ...salaryOption,   salary: salary100 },
    dividendOption: { ...dividendOption, salary: 0 },
    blendedOption:  { ...blendedOption,  salary: blendedSalary },
    recommended:    { ...recommended,    salary: recommendedSalary },
    recommendationReason, gripWarning, gripUnknownNote,
  };
}

// ─── Small shared components ──────────────────────────────────────────────────

function StatRow({ label, value, red }: { label: string; value: string; red?: boolean }) {
  return (
    <div className="flex justify-between text-sm py-1.5 border-b last:border-0" style={{ borderColor: BORDER }}>
      <span style={{ color: MUTED }}>{label}</span>
      <span className="font-semibold" style={{ color: red ? "#F87171" : "white" }}>{value}</span>
    </div>
  );
}

function StrategyCard({
  label, description, salary, dividends, netPersonalCash, totalTaxBurden,
  badge, glow, onSave, isPro,
}: {
  label: string; description?: string; salary: number; dividends: number;
  netPersonalCash: number; totalTaxBurden: number;
  badge?: string; glow?: boolean; onSave?: () => void; isPro?: boolean;
}) {
  return (
    <div
      className="rounded-2xl border p-5 flex flex-col gap-3 relative overflow-hidden"
      style={{
        background: glow ? "rgba(197,163,90,0.06)" : CARD,
        borderColor: glow ? GOLD : BORDER,
        boxShadow: glow
          ? "0 0 0 1px rgba(197,163,90,0.12), 0 8px 40px rgba(197,163,90,0.22)"
          : "none",
      }}
    >
      {glow && (
        <div className="absolute top-0 left-0 right-0 h-px"
          style={{ background: `linear-gradient(90deg, transparent, ${GOLD}, transparent)` }} />
      )}
      {badge && (
        <span className="absolute top-4 right-4 text-xs font-bold px-2.5 py-0.5 rounded-full border"
          style={{
            background: glow ? "rgba(197,163,90,0.15)" : "rgba(255,255,255,0.05)",
            color: GOLD, borderColor: GOLD_BORDER,
          }}>
          {badge}
        </span>
      )}
      <div>
        <p className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: glow ? GOLD : MUTED }}>{label}</p>
        <p className="text-3xl font-extrabold text-white">
          {formatCurrency(netPersonalCash)}
          <span className="text-sm font-normal ml-1" style={{ color: MUTED }}>/yr</span>
        </p>
        <p className="text-xs mt-0.5" style={{ color: DIM }}>After-tax personal cash</p>
        {description && (
          <p className="text-xs mt-2 leading-relaxed" style={{ color: MUTED }}>{description}</p>
        )}
      </div>
      <div>
        <StatRow label="Salary" value={formatCurrency(salary)} />
        <StatRow label="Dividends" value={formatCurrency(dividends)} />
        <StatRow label="Total Tax Burden" value={formatCurrency(totalTaxBurden)} red />
      </div>
      {glow && (
        <div className="flex gap-2 mt-1">
          <Button
            size="sm"
            className="flex-1 font-bold"
            style={isPro ? { background: GOLD, color: BG } : { background: "rgba(197,163,90,0.12)", color: GOLD, border: `1px solid rgba(197,163,90,0.3)` }}
            onClick={onSave}
            data-testid="button-save-strategy"
          >
            {isPro
              ? <><Save className="w-3.5 h-3.5 mr-1.5" />Save Analysis</>
              : <><Lock className="w-3.5 h-3.5 mr-1.5" />Save — Upgrade to Pro</>}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="hover:bg-white/5"
            style={{ color: isPro ? "rgba(255,255,255,0.5)" : "rgba(197,163,90,0.4)" }}
            onClick={isPro ? () => window.print() : onSave}
            title={isPro ? "Export PDF" : "Upgrade to export PDF"}
            data-testid="button-print-strategy"
          >
            {isPro ? <Download className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
          </Button>
        </div>
      )}
    </div>
  );
}

// ─── Toggle button group ──────────────────────────────────────────────────────

function ToggleGroup<T extends string>({
  value, onChange, options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string; sub?: string }[];
}) {
  return (
    <div className={`grid gap-3 ${options.length === 2 ? "grid-cols-2" : "grid-cols-1 sm:grid-cols-3"}`}>
      {options.map(opt => {
        const active = value === opt.value;
        return (
          <button
            key={opt.value}
            onClick={() => onChange(opt.value)}
            className="rounded-xl border px-4 py-3 text-left transition-all"
            style={{
              background: active ? "rgba(197,163,90,0.12)" : "rgba(255,255,255,0.03)",
              borderColor: active ? GOLD : BORDER,
              boxShadow: active ? `0 0 20px rgba(197,163,90,0.15)` : "none",
            }}
            data-testid={`toggle-${opt.value}`}
          >
            <p className="text-sm font-semibold" style={{ color: active ? GOLD : "white" }}>{opt.label}</p>
            {opt.sub && <p className="text-xs mt-0.5" style={{ color: DIM }}>{opt.sub}</p>}
          </button>
        );
      })}
    </div>
  );
}

// ─── Province chip grid ───────────────────────────────────────────────────────

function ProvinceGrid({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
      {PROVINCES.map(p => {
        const active = value === p.value;
        return (
          <button
            key={p.value}
            onClick={() => onChange(p.value)}
            className="rounded-xl border px-4 py-3 text-left transition-all"
            style={{
              background: active ? "rgba(197,163,90,0.12)" : "rgba(255,255,255,0.03)",
              borderColor: active ? GOLD : BORDER,
            }}
            data-testid={`province-${p.value}`}
          >
            <p className="text-base font-bold" style={{ color: active ? GOLD : "white" }}>{p.value}</p>
            <p className="text-xs mt-0.5 truncate" style={{ color: active ? GOLD : DIM }}>{p.label}</p>
          </button>
        );
      })}
    </div>
  );
}

// ─── Progress bar ─────────────────────────────────────────────────────────────

function ProgressBar({ current, total }: { current: number; total: number }) {
  return (
    <div className="mb-10">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold" style={{ color: GOLD }}>Step {current} of {total}</span>
        <span className="text-xs" style={{ color: DIM }}>Income Strategy Wizard</span>
      </div>
      <div className="h-1 rounded-full" style={{ background: "rgba(255,255,255,0.07)" }}>
        <div
          className="h-1 rounded-full transition-all duration-500"
          style={{ width: `${(current / total) * 100}%`, background: GOLD }}
        />
      </div>
      <div className="hidden sm:flex justify-between mt-2">
        {["Province", "Your Numbers", "GRIP Balance", "Preferences"].map((label, i) => (
          <span
            key={label}
            className="text-xs font-medium"
            style={{ color: i + 1 <= current ? GOLD : DIM }}
          >
            {label}
          </span>
        ))}
      </div>
    </div>
  );
}

// ─── $ Input with label ───────────────────────────────────────────────────────

function DollarInput({
  label, hint, value, onChange, placeholder, testId,
}: {
  label: string; hint?: string; value: string;
  onChange: (v: string) => void; placeholder?: string; testId?: string;
}) {
  return (
    <div>
      <label className="block text-sm font-semibold text-white mb-1">{label}</label>
      {hint && <p className="text-xs mb-2.5" style={{ color: DIM }}>{hint}</p>}
      <div className="flex items-center border rounded-xl px-4 py-3 gap-2 transition-colors focus-within:border-amber-500/50"
        style={{ background: "rgba(255,255,255,0.04)", borderColor: BORDER }}>
        <span className="text-lg font-semibold" style={{ color: MUTED }}>$</span>
        <Input
          type="number"
          min={0}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder ?? "0"}
          className="flex-1 h-auto text-xl font-bold border-0 bg-transparent text-white placeholder:text-white/15 focus-visible:ring-0 px-0 py-0"
          data-testid={testId}
        />
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function IncomeStrategy() {
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const isPro = user?.subscriptionStatus === "active" || user?.subscriptionStatus === "trialing";

  const [inputs, setInputs] = useState<Inputs>(DEFAULT_INPUTS);
  const [results, setResults] = useState<ReturnType<typeof computeResults> | null>(null);
  const [step, setStep] = useState<WizardStep | "results">(1);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  const set = <K extends keyof Inputs>(key: K, val: Inputs[K]) =>
    setInputs(prev => ({ ...prev, [key]: val }));

  // ── Navigation ──────────────────────────────────────────────────────────────

  const canAdvance: Record<WizardStep, boolean> = {
    1: !!inputs.province,
    2: (parseFloat(inputs.corporateProfit) || 0) > 0,
    3: true,
    4: true,
  };

  const next = () => {
    if (step === 4) {
      const r = computeResults(inputs);
      if (!r) { toast({ title: "Enter your corporation profit first", variant: "destructive" }); return; }
      setResults(r);
      setStep("results");
    } else {
      setStep(s => (s === "results" ? "results" : ((s as number) + 1) as WizardStep));
    }
  };

  const back = () => {
    if (step === "results") setStep(4);
    else setStep(s => (s === 1 ? 1 : ((s as number) - 1) as WizardStep));
  };

  // ── Save ────────────────────────────────────────────────────────────────────

  const saveStrategy = useMutation({
    mutationFn: () => apiRequest("POST", "/api/income-strategy", {
      title: `Income Strategy – ${new Date().toLocaleDateString("en-CA")}`,
      province: inputs.province,
      corporateProfit: Math.round(parseFloat(inputs.corporateProfit) || 0),
      desiredCashWithdrawal: Math.round(parseFloat(inputs.desiredWithdrawal) || 0),
      gripBalance: inputs.gripKnown === "yes" ? Math.round(parseFloat(inputs.gripAmount) || 0) : null,
      wantsCppRrsp: inputs.wantsCppRrsp,
      preferSimple: inputs.preferSimple === "yes",
      salaryRecommendation: results?.recommended?.salary ?? null,
      dividendRecommendation: results?.recommended?.dividends ?? null,
      blendedNote: results?.recommendationReason,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/income-strategy"] });
      qc.invalidateQueries({ queryKey: ["/api/reports"] });
      toast({ title: "Analysis saved!", description: "Saved to your Reports." });
    },
    onError: () => toast({ title: "Could not save", variant: "destructive" }),
  });

  const handleSave = () => {
    if (!user) { toast({ title: "Sign in to save", description: "Create a free account first." }); return; }
    if (!isPro) { setShowUpgradeModal(true); return; }
    saveStrategy.mutate();
  };

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <AppLayout>
      <style>{`@media print { nav,.no-print{display:none!important} body{background:white!important} }`}</style>

      <NetWorthUpgradeModal open={showUpgradeModal} onClose={() => setShowUpgradeModal(false)} />

      <div className="container mx-auto px-4 py-10 max-w-2xl">

        {/* Page header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border mb-4 text-xs font-semibold"
            style={{ background: "rgba(197,163,90,0.08)", borderColor: GOLD_BORDER, color: GOLD }}>
            <TrendingUp className="w-3.5 h-3.5" />Income Strategy
          </div>
          <h1 className="text-4xl font-bold text-white mb-2">Salary vs Dividend Wizard</h1>
          <p className="text-sm max-w-lg mx-auto" style={{ color: MUTED }}>
            Answer a few questions and get a personalized compensation recommendation for your CCPC.
          </p>
        </div>

        {/* ── WIZARD STEPS ── */}
        {step !== "results" && (
          <div className="rounded-2xl border p-5 sm:p-8" style={{ background: CARD, borderColor: GOLD_BORDER }}>

            <ProgressBar current={step as number} total={4} />

            {/* ── Step 1: Province ── */}
            {step === 1 && (
              <div>
                <p className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: GOLD }}>Step 1</p>
                <h2 className="text-2xl font-bold text-white mb-1">Where is your business incorporated?</h2>
                <p className="text-sm mb-6" style={{ color: MUTED }}>
                  Province affects personal income tax rates. Current calculations use Ontario 2026 rates.
                </p>
                <ProvinceGrid value={inputs.province} onChange={v => set("province", v)} />
                {inputs.province !== "ON" && (
                  <div className="flex items-center gap-2 mt-4 rounded-lg px-3 py-2"
                    style={{ background: "rgba(251,191,36,0.06)", border: "1px solid rgba(251,191,36,0.2)" }}>
                    <Info className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    <p className="text-xs text-amber-300">Results use Ontario 2026 tax rates as an illustration. Consult your accountant for province-specific figures.</p>
                  </div>
                )}
              </div>
            )}

            {/* ── Step 2: Numbers ── */}
            {step === 2 && (
              <div>
                <p className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: GOLD }}>Step 2</p>
                <h2 className="text-2xl font-bold text-white mb-1">What are your corporation's numbers?</h2>
                <p className="text-sm mb-6" style={{ color: MUTED }}>
                  Use your estimated figures for the current tax year. These are not shared or stored without your permission.
                </p>
                <div className="space-y-5">
                  <DollarInput
                    label="Annual corporation profit"
                    hint="Revenue minus business expenses, before owner compensation"
                    value={inputs.corporateProfit}
                    onChange={v => set("corporateProfit", v)}
                    placeholder="e.g. 200,000"
                    testId="input-corp-profit"
                  />
                  <DollarInput
                    label="Desired personal cash withdrawal"
                    hint="How much you want to take out personally this year — leave blank to maximize"
                    value={inputs.desiredWithdrawal}
                    onChange={v => set("desiredWithdrawal", v)}
                    placeholder="e.g. 120,000"
                    testId="input-desired-withdrawal"
                  />
                </div>
              </div>
            )}

            {/* ── Step 3: GRIP ── */}
            {step === 3 && (
              <div>
                <p className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: GOLD }}>Step 3</p>
                <h2 className="text-2xl font-bold text-white mb-1">Do you have a GRIP balance?</h2>
                <p className="text-sm mb-2" style={{ color: MUTED }}>
                  The General Rate Income Pool (GRIP) determines whether your corporation can pay <strong className="text-white">eligible dividends</strong> — which are taxed more favourably in the hands of the owner.
                </p>
                <p className="text-xs mb-6" style={{ color: DIM }}>
                  Check your corporate tax return (T2 Schedule 53) or ask your accountant.
                </p>
                <ToggleGroup
                  value={inputs.gripKnown}
                  onChange={(v: "yes" | "no" | "not_sure") => set("gripKnown", v)}
                  options={[
                    { value: "yes" as const, label: "Yes", sub: "I know my GRIP balance" },
                    { value: "no" as const, label: "No", sub: "No GRIP balance" },
                    { value: "not_sure" as const, label: "Not sure", sub: "I'll check later" },
                  ]}
                />
                {inputs.gripKnown === "yes" && (
                  <div className="mt-5">
                    <DollarInput
                      label="GRIP balance"
                      hint="The amount of eligible dividends you can pay this year"
                      value={inputs.gripAmount}
                      onChange={v => set("gripAmount", v)}
                      placeholder="e.g. 50,000"
                      testId="input-grip-amount"
                    />
                  </div>
                )}
              </div>
            )}

            {/* ── Step 4: Preferences ── */}
            {step === 4 && (
              <div>
                <p className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: GOLD }}>Step 4</p>
                <h2 className="text-2xl font-bold text-white mb-1">What matters most to you?</h2>
                <p className="text-sm mb-6" style={{ color: MUTED }}>
                  Your answers help us tailor the recommendation to your personal situation and priorities.
                </p>

                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-semibold text-white mb-3">
                      CPP contributions and RRSP contribution room
                    </label>
                    <ToggleGroup
                      value={inputs.wantsCppRrsp}
                      onChange={(v: "yes" | "no" | "not_sure") => set("wantsCppRrsp", v)}
                      options={[
                        { value: "yes" as const, label: "Important", sub: "Build pension & RRSP room" },
                        { value: "no" as const, label: "Skip it", sub: "Minimize CPP costs" },
                        { value: "not_sure" as const, label: "Neutral", sub: "Not a priority" },
                      ]}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-white mb-3">
                      Do you prefer simplicity or full tax optimization?
                    </label>
                    <ToggleGroup
                      value={inputs.preferSimple}
                      onChange={(v: "yes" | "no") => set("preferSimple", v)}
                      options={[
                        { value: "no" as const, label: "Optimize", sub: "Maximize after-tax cash" },
                        { value: "yes" as const, label: "Keep it simple", sub: "Easy 50/50 split" },
                      ]}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Step navigation */}
            <div className="flex items-center justify-between mt-8">
              <Button
                variant="ghost"
                onClick={back}
                className="gap-2 text-white/50 hover:text-white hover:bg-white/5"
                disabled={step === 1}
                data-testid="button-back"
              >
                <ArrowLeft className="w-4 h-4" />Back
              </Button>
              <Button
                onClick={next}
                disabled={!canAdvance[step as WizardStep]}
                className="gap-2 font-bold px-6"
                style={{ background: GOLD, color: BG }}
                data-testid={step === 4 ? "button-calculate" : "button-next"}
              >
                {step === 4 ? (
                  <><TrendingUp className="w-4 h-4" />Generate Strategy</>
                ) : (
                  <>Continue<ArrowRight className="w-4 h-4" /></>
                )}
              </Button>
            </div>
          </div>
        )}

        {/* ── RESULTS ── */}
        {step === "results" && results && (
          <div className="space-y-8">

            {/* Back + recalculate bar */}
            <div className="flex items-center justify-between no-print">
              <button onClick={back}
                className="flex items-center gap-1.5 text-sm hover:text-white transition-colors"
                style={{ color: MUTED }} data-testid="button-back-to-form">
                <ArrowLeft className="w-4 h-4" />Edit inputs
              </button>
              <div className="flex items-center gap-3">
                <span className="text-xs px-3 py-1 rounded-full border font-semibold"
                  style={{ background: "rgba(197,163,90,0.08)", borderColor: GOLD_BORDER, color: GOLD }}>
                  {PROVINCES.find(p => p.value === inputs.province)?.label} · {formatCurrency(results.profit)} profit
                </span>
                <button
                  onClick={() => { setResults(computeResults(inputs)); }}
                  className="p-1.5 rounded-lg hover:bg-white/5 transition-colors"
                  style={{ color: DIM }}
                  title="Recalculate"
                  data-testid="button-recalculate"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Preview-only banner for free users */}
            {user && !isPro && (
              <div className="rounded-xl border p-4 flex items-center justify-between gap-4 no-print"
                style={{ background: "rgba(197,163,90,0.05)", borderColor: GOLD_BORDER }}>
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                    style={{ background: "rgba(197,163,90,0.12)" }}>
                    <Lock className="w-3.5 h-3.5" style={{ color: GOLD }} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">Preview mode</p>
                    <p className="text-xs" style={{ color: MUTED }}>
                      You can view your full analysis — upgrade to Pro to save it and export a PDF for your accountant.
                    </p>
                  </div>
                </div>
                <Button
                  size="sm"
                  className="font-bold whitespace-nowrap shrink-0"
                  style={{ background: GOLD, color: BG }}
                  onClick={() => setShowUpgradeModal(true)}
                  data-testid="button-upgrade-preview"
                >
                  <Crown className="w-3.5 h-3.5 mr-1.5" />Upgrade
                </Button>
              </div>
            )}

            {/* Alerts */}
            {results.gripWarning && (
              <div className="rounded-xl border p-4 flex items-start gap-3"
                style={{ background: "rgba(251,191,36,0.06)", borderColor: "rgba(251,191,36,0.3)" }}>
                <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-amber-300">Eligible dividend amount may exceed GRIP</p>
                  <p className="text-xs mt-0.5" style={{ color: MUTED }}>Review with your accountant before paying eligible dividends that exceed your GRIP balance.</p>
                </div>
              </div>
            )}

            {results.gripUnknownNote && (
              <div className="rounded-xl border p-4 flex items-start gap-3"
                style={{ background: "rgba(96,165,250,0.06)", borderColor: "rgba(96,165,250,0.2)" }}>
                <Info className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
                <p className="text-xs" style={{ color: MUTED }}>
                  <strong className="text-white">GRIP not provided:</strong>{" "}
                  Analysis uses non-eligible dividends (typical for CCPC). If you have GRIP, consult your accountant about eligible dividends.
                </p>
              </div>
            )}

            {/* 3 comparison cards */}
            <div>
              <h2 className="text-lg font-bold text-white mb-1">Compare Your Options</h2>
              <p className="text-xs mb-4" style={{ color: MUTED }}>
                All figures are educational estimates using 2026 Ontario federal + provincial tax brackets.
              </p>
              <div className="grid md:grid-cols-3 gap-4">
                <StrategyCard
                  label="Salary Option"
                  description="Pay yourself entirely as employment income. Builds CPP and RRSP room, but triggers the highest combined personal tax rate."
                  salary={results.salaryOption.salary}
                  dividends={results.salaryOption.dividends ?? 0}
                  netPersonalCash={results.salaryOption.netPersonalCash}
                  totalTaxBurden={results.salaryOption.totalTaxBurden}
                  badge="All salary"
                  isPro={isPro}
                />
                <StrategyCard
                  label="Dividend Option"
                  description="Leave profits in the corporation and pay yourself non-eligible dividends. Lower personal tax, but no CPP contributions or RRSP room."
                  salary={0}
                  dividends={results.dividendOption.dividends ?? 0}
                  netPersonalCash={results.dividendOption.netPersonalCash}
                  totalTaxBurden={results.dividendOption.totalTaxBurden}
                  badge="All dividends"
                  isPro={isPro}
                />
                <StrategyCard
                  label="Blended Option"
                  description="Split compensation between salary and dividends to minimize the combined tax burden while preserving some CPP and RRSP room."
                  salary={results.blendedOption.salary}
                  dividends={results.blendedOption.dividends ?? 0}
                  netPersonalCash={results.blendedOption.netPersonalCash}
                  totalTaxBurden={results.blendedOption.totalTaxBurden}
                  badge="Optimized blend"
                  isPro={isPro}
                />
              </div>
            </div>

            {/* Accountant review notice */}
            <div className="rounded-xl border p-4 flex items-start gap-3"
              style={{ background: "rgba(251,191,36,0.05)", borderColor: "rgba(251,191,36,0.25)" }}>
              <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-amber-300">Review with your accountant before acting</p>
                <p className="text-xs mt-1 leading-relaxed" style={{ color: MUTED }}>
                  This analysis is educational only — it is not tax or financial advice. Your actual tax situation depends on factors like corporate retained earnings, RRSP room, spousal income, and eligible vs. non-eligible dividend designation. A CPA can validate the right mix for your corporation before you file.
                </p>
              </div>
            </div>

            {/* Recommended */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Star className="w-5 h-5" style={{ color: GOLD }} />
                <h2 className="text-lg font-bold text-white">Recommended for You</h2>
              </div>

              <StrategyCard
                label="Recommended Strategy"
                salary={results.recommended.salary}
                dividends={results.recommended.dividends ?? 0}
                netPersonalCash={results.recommended.netPersonalCash}
                totalTaxBurden={results.recommended.totalTaxBurden}
                badge="Best for you"
                glow
                isPro={isPro}
                onSave={handleSave}
              />

              {/* Explanation card */}
              <div className="mt-4 rounded-2xl border p-5" style={{ background: CARD, borderColor: GOLD_BORDER }}>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                    style={{ background: "rgba(197,163,90,0.12)" }}>
                    <Star className="w-3.5 h-3.5" style={{ color: GOLD }} />
                  </div>
                  <p className="text-sm font-bold text-white">Why this strategy?</p>
                </div>
                <p className="text-sm mb-4" style={{ color: MUTED }}>{results.recommendationReason}</p>
                <div className="space-y-2">
                  {[
                    "Based on your CPP, RRSP, and simplicity preferences",
                    "Uses 2026 Ontario federal + provincial tax brackets",
                    "Accounts for employer and employee CPP contributions",
                    "Accountant review recommended before implementing",
                  ].map(b => (
                    <div key={b} className="flex items-center gap-2 text-sm" style={{ color: MUTED }}>
                      <Check className="w-3.5 h-3.5 shrink-0" style={{ color: GOLD }} />
                      {b}
                    </div>
                  ))}
                </div>
                {results.gripUnknownNote && (
                  <p className="text-xs mt-3 pt-3 border-t" style={{ borderColor: BORDER, color: DIM }}>
                    Note: Review GRIP with your accountant before using eligible dividends.
                  </p>
                )}
              </div>
            </div>

            {/* Upgrade banner for non-pro */}
            {!isPro && (
              <div className="rounded-2xl border p-5 no-print"
                style={{ background: "rgba(197,163,90,0.06)", borderColor: GOLD_BORDER }}>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <Crown className="w-6 h-6 shrink-0" style={{ color: GOLD }} />
                    <p className="text-sm text-white">Save this analysis and export a professional PDF for your accountant.</p>
                  </div>
                  <Button
                    size="sm"
                    className="font-bold whitespace-nowrap gap-1.5"
                    style={{ background: GOLD, color: BG }}
                    onClick={() => setShowUpgradeModal(true)}
                    data-testid="button-upgrade-strategy"
                  >
                    <Crown className="w-3.5 h-3.5" />
                    Upgrade — $8.99/mo
                  </Button>
                </div>
              </div>
            )}

            <p className="text-xs text-center pb-4" style={{ color: DIM }}>
              Educational estimate only. Not tax, legal, accounting, or investment advice.
            </p>
          </div>
        )}

        {!user && step === 1 && (
          <p className="text-center text-sm mt-4" style={{ color: DIM }}>
            <Link href="/signup" className="font-semibold hover:underline" style={{ color: GOLD }}>
              Create a free account
            </Link>{" "}
            to save your income strategy analysis.
          </p>
        )}
      </div>
    </AppLayout>
  );
}
