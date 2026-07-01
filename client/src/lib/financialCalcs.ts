/**
 * financialCalcs.ts — Adavi compensation calculation exports
 *
 * The underlying engine is ontario2026.ts. This file re-exports the same
 * public API as before so Demo.tsx and other consumers require no changes.
 */

import {
  calculateOntarioOwnerCompensation2026,
  calculateCPP2026,
  DividendType,
  Ontario2026Result,
} from "./tax/ontario2026";
import {
  CPP_YMPE_2026,
  CPP_YAMPE_2026,
  FEDERAL_BRACKETS_2026,
  FEDERAL_BPA_2026,
  ONTARIO_BRACKETS_2026,
  ONTARIO_BPA_2026,
  CORP_ONTARIO_SBD_RATE_H1_2026,
  CORP_FEDERAL_SBD_RATE_2026,
  RRSP_DOLLAR_LIMIT_2026,
} from "./tax/constants2026";

// ─── TAX_CONFIG (backward-compat) ─────────────────────────────────────────────
export const TAX_CONFIG = {
  federalBrackets:      FEDERAL_BRACKETS_2026,
  ontarioBrackets:      ONTARIO_BRACKETS_2026,
  basicPersonalFederal: FEDERAL_BPA_2026,
  basicPersonalOntario: ONTARIO_BPA_2026,
  cppMaxPensionable:    CPP_YMPE_2026,
  cppYAMPE:             CPP_YAMPE_2026,
  corpSmallBusiness:    CORP_FEDERAL_SBD_RATE_2026 + CORP_ONTARIO_SBD_RATE_H1_2026,
} as const;

// ─── Types ─────────────────────────────────────────────────────────────────────

/**
 * Dividend mode for the Visualizer UI.
 * "nonEligible" and "eligible" auto-compute 100% of the available pool.
 * "mixed" shows two separate dollar inputs and passes them explicitly to the engine.
 */
export type DividendMode = "nonEligible" | "eligible" | "mixed";

export interface FinancialInputs {
  revenue:  number;
  expenses: number;
  salary:   number;
  dividendType?: DividendType;
  otherPersonalIncome?: number;
  rrspDeduction?: number;
}

// FinancialResults is a superset of Ontario2026Result for backward compat.
export type FinancialResults = Ontario2026Result;

export interface OptimizationResult {
  recommendedSalaryPercent: number;
  recommendedSalary:        number;
  recommendedDividends:     number;
  bestNetTakeHome:          number;
  worstNetTakeHome:         number;
  estimatedGain:            number;
  minimumTotalTax:          number;
}

// ─── Core function ─────────────────────────────────────────────────────────────

export function calculateFinancials(inputs: FinancialInputs): FinancialResults {
  return calculateOntarioOwnerCompensation2026({
    revenue:             inputs.revenue,
    businessExpenses:    inputs.expenses,
    salaryPaid:          inputs.salary,
    dividendType:        inputs.dividendType ?? "nonEligible",
    otherPersonalIncome: inputs.otherPersonalIncome ?? 0,
    rrspDeduction:       inputs.rrspDeduction ?? 0,
  });
}

// ─── Optimization engine ───────────────────────────────────────────────────────
//
// Loops salary% 0→100 in 1% steps, maximises netPersonalCash.
// Uses nonEligible dividends as the conservative default.

export function optimizeCompensation(
  revenue: number,
  expenses: number,
  dividendType: DividendType = "nonEligible",
): OptimizationResult | null {
  const netIncome = Math.max(0, revenue - expenses);
  if (netIncome === 0) return null;

  let bestPct  = 0;
  let bestTH   = -Infinity;
  let worstTH  = Infinity;
  let minTax   = Infinity;

  for (let step = 0; step <= 100; step++) {
    const salary = Math.round(netIncome * (step / 100));
    const r = calculateFinancials({ revenue, expenses, salary, dividendType });
    if (r.netPersonalCash > bestTH)  { bestTH = r.netPersonalCash;  bestPct = step; }
    if (r.netPersonalCash < worstTH) { worstTH = r.netPersonalCash; }
    if (r.totalTaxBurden  < minTax)  { minTax  = r.totalTaxBurden;  }
  }

  const bestSalary = Math.round(netIncome * (bestPct / 100));
  const bestR      = calculateFinancials({ revenue, expenses, salary: bestSalary, dividendType });

  return {
    recommendedSalaryPercent: bestPct,
    recommendedSalary:        bestSalary,
    recommendedDividends:     bestR.dividends,
    bestNetTakeHome:          Math.round(bestTH),
    worstNetTakeHome:         Math.round(worstTH),
    estimatedGain:            Math.round(bestTH - worstTH),
    minimumTotalTax:          Math.round(minTax),
  };
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

export function formatCurrency(n: number): string {
  if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (Math.abs(n) >= 1_000)     return `$${(n / 1_000).toFixed(1)}k`;
  return `$${n.toFixed(0)}`;
}

/**
 * computeMix — derives salary and after-corp-tax dividends for a given salary %
 * of net income. Uses the 2026 engine with nonEligible dividends by default.
 */
export function computeMix(
  revenue:   number,
  expenses:  number,
  salaryPct: number,
  dividendType: DividendType = "nonEligible",
): { salary: number; dividends: number } {
  const netIncome = Math.max(0, revenue - expenses);
  const salary    = Math.round(netIncome * (salaryPct / 100));
  const { dividends } = calculateFinancials({ revenue, expenses, salary, dividendType });
  return { salary, dividends };
}

// Re-export types for convenience
export type { DividendType, DividendMode };
export { calculateOntarioOwnerCompensation2026 };
