/**
 * Ontario 2026 Owner-Manager Compensation Engine
 *
 * Educational planning tool for Ontario CCPC owner-managers.
 * Models the full two-layer (corporate + personal) tax outcome for
 * salary vs. dividend compensation strategies.
 *
 * Implements:
 *  1. Progressive federal + Ontario personal tax brackets
 *  2. Dividend gross-up and dividend tax credits (eligible vs non-eligible, including mixed)
 *  3. CPP base + CPP2 enhancement layers (YMPE / YAMPE)
 *  4. Ontario corporate tax with H1/H2 SBD rate change
 *  5. Ontario surtax
 *  6. RRSP room from earned employment income
 *  7. GRIP validation warnings for eligible dividends
 *
 * Limitations (disclose in UI):
 *  - Not filing-grade software
 *  - Does not fully model AMT, RDTOH, CDA, GRIP continuity
 *  - Does not determine salary reasonableness (ITA s.67)
 *  - Does not model family income-splitting, all credits, or all deductions
 *  - Personal bracket thresholds use 2025 confirmed values (2026 to be indexed)
 *  - Does not calculate Part III.1 tax — only warns
 *
 * Always consult a qualified CPA for actual tax planning.
 */

import {
  TaxBracket,
  FEDERAL_BRACKETS_2026,
  FEDERAL_BPA_2026,
  ONTARIO_BRACKETS_2026,
  ONTARIO_BPA_2026,
  ONTARIO_SURTAX_THRESHOLD_1_2026,
  ONTARIO_SURTAX_RATE_1_2026,
  ONTARIO_SURTAX_THRESHOLD_2_2026,
  ONTARIO_SURTAX_RATE_2_2026,
  CPP_BASIC_EXEMPTION_2026,
  CPP_YMPE_2026,
  CPP_YAMPE_2026,
  CPP_BASE_EMPLOYEE_RATE_2026,
  CPP_BASE_EMPLOYER_RATE_2026,
  CPP2_EMPLOYEE_RATE_2026,
  CPP2_EMPLOYER_RATE_2026,
  CORP_FEDERAL_SBD_RATE_2026,
  CORP_FEDERAL_GENERAL_RATE_2026,
  CORP_ONTARIO_SBD_RATE_H1_2026,
  CORP_ONTARIO_SBD_RATE_H2_2026,
  CORP_ONTARIO_GENERAL_RATE_2026,
  CORP_SBD_LIMIT_2026,
  CORP_TAXABLE_CAPITAL_GRIND_START,
  CORP_TAXABLE_CAPITAL_GRIND_END,
  NON_ELIGIBLE_GROSS_UP_RATE_2026,
  NON_ELIGIBLE_FEDERAL_DTC_RATE_2026,
  NON_ELIGIBLE_ONTARIO_DTC_RATE_2026,
  ELIGIBLE_GROSS_UP_RATE_2026,
  ELIGIBLE_FEDERAL_DTC_RATE_2026,
  ELIGIBLE_ONTARIO_DTC_RATE_2026,
  RRSP_EARNED_INCOME_RATE_2026,
  RRSP_DOLLAR_LIMIT_2026,
} from "./constants2026";

export type DividendType = "eligible" | "nonEligible";

// ─── Input types ──────────────────────────────────────────────────────────────

/** Explicit split of dividends into eligible and non-eligible portions. */
export interface DividendSplit {
  nonEligible: number;
  eligible: number;
}

export interface Ontario2026Input {
  revenue: number;
  businessExpenses: number;
  salaryPaid: number;

  /**
   * NEW: Explicit eligible/non-eligible split.
   * When provided, `dividendType` is ignored and these amounts are used directly.
   * Validation: nonEligible + eligible must not exceed availableDividendPool.
   */
  dividends?: DividendSplit;

  /**
   * LEGACY: Auto-compute 100% of after-tax corporate pool to this single type.
   * Ignored when `dividends` is provided.
   */
  dividendType?: DividendType;

  /**
   * NEW: Corporation's available General Rate Income Pool.
   * Used to warn when eligible dividends exceed GRIP.
   */
  availableGRIP?: number;

  otherPersonalIncome?: number;
  rrspDeduction?: number;
  corporateIncomeType?: "smallBusiness" | "general";
  useOntarioMidYearRateChange?: boolean;
  taxableCapitalEmployedInCanada?: number;
  adjustedAggregateInvestmentIncome?: number;
}

// ─── Dividend breakdown (new detailed result) ─────────────────────────────────

export interface DividendBreakdown {
  nonEligibleCash: number;
  eligibleCash: number;
  totalCash: number;
  nonEligibleGrossUpAmount: number;
  eligibleGrossUpAmount: number;
  totalGrossUpAmount: number;
  nonEligibleTaxableAmount: number;
  eligibleTaxableAmount: number;
  totalTaxableAmount: number;
  federalDTCNonEligible: number;
  federalDTCEligible: number;
  ontarioDTCNonEligible: number;
  ontarioDTCEligible: number;
  totalFederalDTC: number;
  totalOntarioDTC: number;
  totalDTC: number;
}

// ─── Result type ──────────────────────────────────────────────────────────────

export interface Ontario2026Result {
  // ── Corporate layer ──
  netCorporateIncomeBeforeTax: number;
  employerCPP: number;
  employerCPP2: number;
  corporateTaxableIncome: number;
  corporateTaxFederal: number;
  corporateTaxOntario: number;
  totalCorporateTax: number;
  afterCorporateTaxIncome: number;
  availableDividendPool: number;

  // ── Dividend layer (new detailed breakdown) ──
  dividendBreakdown: DividendBreakdown;

  // ── Dividend layer (backward-compat flat fields) ──
  dividendPaid: number;
  dividendType: DividendType;
  dividendGrossUp: number;
  taxableDividendAmount: number;
  federalDividendTaxCredit: number;
  ontarioDividendTaxCredit: number;

  // ── CPP layer ──
  employeeCPP: number;
  employeeCPP2: number;

  // ── Personal tax layer ──
  personalTaxableIncome: number;
  federalTaxGross: number;
  personalTaxFederal: number;
  ontarioTaxGross: number;
  ontarioSurtax: number;
  personalTaxOntario: number;
  totalPersonalTaxAfterCredits: number;

  // ── Totals ──
  totalTaxBurden: number;
  netCashToOwner: number;
  retainedCorporateCash: number;
  rrspRoomGenerated: number;

  // ── Effective rates (whole-number %) ──
  effectivePersonalTaxRate: number;
  effectiveCorporateTaxRate: number;
  integratedTaxRate: number;

  // ── Backward-compatible aliases (for Demo.tsx, older consumers) ──
  afterTaxCorporateIncome: number;
  corpTax: number;
  dividends: number;
  salaryTax: number;
  dividendTax: number;
  totalPersonalTax: number;
  netPersonalCash: number;
  grossPersonalIncome: number;
  effectiveTaxRate: number;
  cppDeduction: number;
  netCorpIncome: number;
  retainedEarnings: number;

  warnings: string[];
}

// ─── Internal: progressive bracket helper ─────────────────────────────────────

function progressiveTax(income: number, brackets: TaxBracket[]): number {
  if (income <= 0) return 0;
  let tax = 0;
  let prev = 0;
  for (const b of brackets) {
    if (income <= prev) break;
    tax += (Math.min(income, b.upTo) - prev) * b.rate;
    if (b.upTo === Infinity) break;
    prev = b.upTo;
  }
  return Math.max(0, tax);
}

// ─── Federal personal tax (after BPA credit, before DTC) ──────────────────────

export function calculateFederalPersonalTax2026(taxableIncome: number): number {
  if (taxableIncome <= 0) return 0;
  const grossTax  = progressiveTax(taxableIncome, FEDERAL_BRACKETS_2026);
  const bpaCredit = Math.min(taxableIncome, FEDERAL_BPA_2026) * 0.15;
  return Math.max(0, grossTax - bpaCredit);
}

// ─── Ontario personal tax (after BPA credit, before surtax and DTC) ───────────

export function calculateOntarioPersonalTax2026(taxableIncome: number): number {
  if (taxableIncome <= 0) return 0;
  const grossTax  = progressiveTax(taxableIncome, ONTARIO_BRACKETS_2026);
  const bpaCredit = Math.min(taxableIncome, ONTARIO_BPA_2026) * 0.0505;
  return Math.max(0, grossTax - bpaCredit);
}

// ─── Ontario surtax ───────────────────────────────────────────────────────────

export function calculateOntarioSurtax2026(basicOntarioTax: number): number {
  if (basicOntarioTax <= 0) return 0;
  const tier1 = Math.max(0, basicOntarioTax - ONTARIO_SURTAX_THRESHOLD_1_2026);
  const tier2 = Math.max(0, basicOntarioTax - ONTARIO_SURTAX_THRESHOLD_2_2026);
  return ONTARIO_SURTAX_RATE_1_2026 * tier1 + ONTARIO_SURTAX_RATE_2_2026 * tier2;
}

// ─── CPP / CPP2 (2026) ────────────────────────────────────────────────────────

export interface CPPResult {
  employeeCPP: number;
  employerCPP: number;
  employeeCPP2: number;
  employerCPP2: number;
}

export function calculateCPP2026(
  salary: number,
  options: { includeCPP2?: boolean } = {},
): CPPResult {
  const { includeCPP2 = true } = options;

  if (salary <= CPP_BASIC_EXEMPTION_2026) {
    return { employeeCPP: 0, employerCPP: 0, employeeCPP2: 0, employerCPP2: 0 };
  }

  const baseEarnings = Math.max(0, Math.min(salary, CPP_YMPE_2026) - CPP_BASIC_EXEMPTION_2026);
  const employeeCPP  = baseEarnings * CPP_BASE_EMPLOYEE_RATE_2026;
  const employerCPP  = baseEarnings * CPP_BASE_EMPLOYER_RATE_2026;

  let employeeCPP2 = 0;
  let employerCPP2 = 0;
  if (includeCPP2 && salary > CPP_YMPE_2026) {
    const cpp2Earnings = Math.min(salary, CPP_YAMPE_2026) - CPP_YMPE_2026;
    employeeCPP2 = cpp2Earnings * CPP2_EMPLOYEE_RATE_2026;
    employerCPP2 = cpp2Earnings * CPP2_EMPLOYER_RATE_2026;
  }

  return { employeeCPP, employerCPP, employeeCPP2, employerCPP2 };
}

// ─── Dividend gross-up (backward compat) ──────────────────────────────────────

export function calculateDividendTaxableAmount(
  dividendCash: number,
  dividendType: DividendType,
): number {
  if (dividendCash <= 0) return 0;
  const grossUpRate = dividendType === "eligible"
    ? ELIGIBLE_GROSS_UP_RATE_2026
    : NON_ELIGIBLE_GROSS_UP_RATE_2026;
  return dividendCash * (1 + grossUpRate);
}

// ─── Dividend tax credits (backward compat) ───────────────────────────────────

interface DividendTaxCredits {
  federalDTC: number;
  ontarioDTC: number;
}

export function calculateDividendTaxCredits(
  dividendCash: number,
  dividendType: DividendType,
): DividendTaxCredits {
  if (dividendCash <= 0) return { federalDTC: 0, ontarioDTC: 0 };
  const taxableAmount = calculateDividendTaxableAmount(dividendCash, dividendType);
  const federalRate   = dividendType === "eligible"
    ? ELIGIBLE_FEDERAL_DTC_RATE_2026
    : NON_ELIGIBLE_FEDERAL_DTC_RATE_2026;
  const ontarioRate   = dividendType === "eligible"
    ? ELIGIBLE_ONTARIO_DTC_RATE_2026
    : NON_ELIGIBLE_ONTARIO_DTC_RATE_2026;
  return {
    federalDTC: taxableAmount * federalRate,
    ontarioDTC: taxableAmount * ontarioRate,
  };
}

// ─── NEW: compute dividend breakdown for a split of eligible + non-eligible ───

export function calculateDividendBreakdown(split: DividendSplit): DividendBreakdown {
  const { nonEligible: neCash, eligible: elCash } = split;

  const neTaxable = neCash > 0 ? neCash * (1 + NON_ELIGIBLE_GROSS_UP_RATE_2026) : 0;
  const elTaxable = elCash > 0 ? elCash * (1 + ELIGIBLE_GROSS_UP_RATE_2026)     : 0;

  const fedDTCNE = neTaxable * NON_ELIGIBLE_FEDERAL_DTC_RATE_2026;
  const fedDTCEL = elTaxable * ELIGIBLE_FEDERAL_DTC_RATE_2026;
  const onDTCNE  = neTaxable * NON_ELIGIBLE_ONTARIO_DTC_RATE_2026;
  const onDTCEL  = elTaxable * ELIGIBLE_ONTARIO_DTC_RATE_2026;

  const totalFedDTC = fedDTCNE + fedDTCEL;
  const totalOnDTC  = onDTCNE  + onDTCEL;

  return {
    nonEligibleCash:         neCash,
    eligibleCash:            elCash,
    totalCash:               neCash + elCash,
    nonEligibleGrossUpAmount: neTaxable - neCash,
    eligibleGrossUpAmount:   elTaxable - elCash,
    totalGrossUpAmount:      (neTaxable + elTaxable) - (neCash + elCash),
    nonEligibleTaxableAmount: neTaxable,
    eligibleTaxableAmount:   elTaxable,
    totalTaxableAmount:      neTaxable + elTaxable,
    federalDTCNonEligible:   fedDTCNE,
    federalDTCEligible:      fedDTCEL,
    ontarioDTCNonEligible:   onDTCNE,
    ontarioDTCEligible:      onDTCEL,
    totalFederalDTC:         totalFedDTC,
    totalOntarioDTC:         totalOnDTC,
    totalDTC:                totalFedDTC + totalOnDTC,
  };
}

// ─── Corporate tax ────────────────────────────────────────────────────────────

interface CorporateTaxOptions {
  corporateIncomeType?: "smallBusiness" | "general";
  useOntarioMidYearRateChange?: boolean;
  taxableCapital?: number;
  adjustedAggregateInvestmentIncome?: number;
}

interface CorporateTaxResult {
  federalTax: number;
  ontarioTax: number;
  totalTax: number;
  warnings: string[];
}

export function calculateOntarioCorporateTax2026(
  corporateTaxableIncome: number,
  options: CorporateTaxOptions = {},
): CorporateTaxResult {
  if (corporateTaxableIncome <= 0) {
    return { federalTax: 0, ontarioTax: 0, totalTax: 0, warnings: [] };
  }

  const {
    corporateIncomeType = "smallBusiness",
    useOntarioMidYearRateChange = false,
    taxableCapital,
    adjustedAggregateInvestmentIncome,
  } = options;

  const warnings: string[] = [];

  if (taxableCapital !== undefined && taxableCapital > CORP_TAXABLE_CAPITAL_GRIND_START) {
    warnings.push("Small business deduction may be reduced by taxable capital over $10M.");
  }
  if (adjustedAggregateInvestmentIncome !== undefined && adjustedAggregateInvestmentIncome > 0) {
    warnings.push("Small business deduction may be reduced by adjusted aggregate investment income.");
  }

  const isSmallBusiness = corporateIncomeType === "smallBusiness";

  let ontarioSBDRate: number;
  if (isSmallBusiness) {
    if (useOntarioMidYearRateChange) {
      ontarioSBDRate = (CORP_ONTARIO_SBD_RATE_H1_2026 + CORP_ONTARIO_SBD_RATE_H2_2026) / 2;
      warnings.push(
        "Ontario SBD rate blended to 2.7% (3.2% Jan–Jun + 2.2% Jul–Dec for 2026 calendar year).",
      );
    } else {
      ontarioSBDRate = CORP_ONTARIO_SBD_RATE_H1_2026;
      warnings.push(
        "Ontario SBD rate 3.2% (H1 2026). Ontario announced reduction to 2.2% effective July 1, 2026.",
      );
    }
  }

  const sbdIncome     = isSmallBusiness ? Math.min(corporateTaxableIncome, CORP_SBD_LIMIT_2026) : 0;
  const generalIncome = corporateTaxableIncome - sbdIncome;

  if (isSmallBusiness && generalIncome > 0) {
    warnings.push("Income exceeds $500k SBD limit — general corporate rates applied on the excess.");
  }

  const federalTax =
    sbdIncome * CORP_FEDERAL_SBD_RATE_2026 +
    generalIncome * CORP_FEDERAL_GENERAL_RATE_2026;

  const ontarioTax = isSmallBusiness
    ? sbdIncome * ontarioSBDRate! + generalIncome * CORP_ONTARIO_GENERAL_RATE_2026
    : corporateTaxableIncome * CORP_ONTARIO_GENERAL_RATE_2026;

  return { federalTax, ontarioTax, totalTax: federalTax + ontarioTax, warnings };
}

// ─── Main compensation calculator ────────────────────────────────────────────
//
// Calculation flow:
//  1. employerCPP/CPP2 deducted from corporate income (payroll cost)
//  2. Corporate tax on (revenue − expenses − salary − employerCPP/CPP2)
//  3. Dividends resolved from either manual split (dividends input) or auto-mode (dividendType)
//  4. Dividends grossed up separately by type → personal tax calculation
//  5. Personal tax: progressive federal + Ontario brackets − BPA credits − DTC (by type)
//  6. Net cash = salary + dividends − employeeCPP/CPP2 − personal tax
//  7. Total tax = revenue − expenses − netCash  (fundamental identity)
//  8. GRIP validation warnings added if eligible dividends are modelled

export function calculateOntarioOwnerCompensation2026(
  input: Ontario2026Input,
): Ontario2026Result {
  const {
    revenue,
    businessExpenses,
    salaryPaid: rawSalary,
    dividends: explicitDividends,
    dividendType         = "nonEligible",
    availableGRIP,
    otherPersonalIncome  = 0,
    rrspDeduction        = 0,
    corporateIncomeType  = "smallBusiness",
    useOntarioMidYearRateChange = false,
    taxableCapitalEmployedInCanada,
    adjustedAggregateInvestmentIncome,
  } = input;

  const warnings: string[] = [];

  // ── 1. Corporate layer ────────────────────────────────────────────────────
  const netCorporateIncomeBeforeTax = Math.max(0, revenue - businessExpenses);
  const effectiveSalary = Math.min(rawSalary, netCorporateIncomeBeforeTax);

  const cpp = calculateCPP2026(effectiveSalary, { includeCPP2: true });

  const corporateTaxableIncome = Math.max(
    0,
    netCorporateIncomeBeforeTax - effectiveSalary - cpp.employerCPP - cpp.employerCPP2,
  );

  const corpTaxResult = calculateOntarioCorporateTax2026(corporateTaxableIncome, {
    corporateIncomeType,
    useOntarioMidYearRateChange,
    taxableCapital: taxableCapitalEmployedInCanada,
    adjustedAggregateInvestmentIncome,
  });
  warnings.push(...corpTaxResult.warnings);

  const afterCorporateTaxIncome = Math.max(0, corporateTaxableIncome - corpTaxResult.totalTax);
  const availableDividendPool   = afterCorporateTaxIncome;

  // ── 2. Resolve dividend split ─────────────────────────────────────────────
  let nonEligibleCash: number;
  let eligibleCash: number;

  if (explicitDividends) {
    // Manual split mode (mixed or explicit allocation)
    nonEligibleCash = Math.max(0, explicitDividends.nonEligible);
    eligibleCash    = Math.max(0, explicitDividends.eligible);
    const total = nonEligibleCash + eligibleCash;
    if (total > availableDividendPool + 0.5) {
      warnings.push(
        "Total dividends exceed estimated after-tax corporate income available for distribution.",
      );
    }
  } else {
    // Auto mode: 100% of pool goes to the selected dividend type
    if (dividendType === "eligible") {
      nonEligibleCash = 0;
      eligibleCash    = availableDividendPool;
    } else {
      nonEligibleCash = availableDividendPool;
      eligibleCash    = 0;
    }
  }

  // ── 3. GRIP validation ────────────────────────────────────────────────────
  if (eligibleCash > 0) {
    if (availableGRIP === undefined || availableGRIP === null) {
      warnings.push(
        "Eligible dividends generally require GRIP or general-rate income. " +
        "No GRIP balance was entered — Adavi cannot verify support for eligible dividends.",
      );
    } else if (eligibleCash > availableGRIP) {
      warnings.push(
        "Eligible dividends exceed the entered GRIP balance. " +
        "Eligible dividends generally require sufficient GRIP or general-rate income. " +
        "Incorrect eligible dividend designations may result in Part III.1 tax consequences. " +
        "Review with a CPA.",
      );
    }
    if (corporateIncomeType === "smallBusiness") {
      warnings.push(
        "Most Ontario CCPC small-business income produces non-eligible dividends. " +
        "Eligible dividends usually require GRIP or income taxed at the general corporate rate.",
      );
    }
  }

  // ── 4. Dividend gross-up and tax credits ──────────────────────────────────
  const breakdown = calculateDividendBreakdown({ nonEligible: nonEligibleCash, eligible: eligibleCash });

  const {
    totalTaxableAmount,
    totalFederalDTC,
    totalOntarioDTC,
    totalCash,
    totalGrossUpAmount,
  } = breakdown;

  // ── 5. Personal taxable income ────────────────────────────────────────────
  const personalTaxableIncome = Math.max(
    0,
    effectiveSalary + totalTaxableAmount + otherPersonalIncome - rrspDeduction,
  );

  // ── 6. Federal personal tax ───────────────────────────────────────────────
  const federalTaxGross    = progressiveTax(personalTaxableIncome, FEDERAL_BRACKETS_2026);
  const federalBPACredit   = Math.min(personalTaxableIncome, FEDERAL_BPA_2026) * 0.15;
  const federalAfterBPA    = Math.max(0, federalTaxGross - federalBPACredit);
  const personalTaxFederal = Math.max(0, federalAfterBPA - totalFederalDTC);

  // ── 7. Ontario personal tax (incl. surtax) ────────────────────────────────
  const ontarioTaxGross    = progressiveTax(personalTaxableIncome, ONTARIO_BRACKETS_2026);
  const ontarioBPACredit   = Math.min(personalTaxableIncome, ONTARIO_BPA_2026) * 0.0505;
  const ontarioAfterBPA    = Math.max(0, ontarioTaxGross - ontarioBPACredit);
  const ontarioSurtax      = calculateOntarioSurtax2026(ontarioAfterBPA);
  const ontarioBeforeDTC   = ontarioAfterBPA + ontarioSurtax;
  const personalTaxOntario = Math.max(0, ontarioBeforeDTC - totalOntarioDTC);

  const totalPersonalTaxAfterCredits = personalTaxFederal + personalTaxOntario;

  // ── 8. Net cash to owner ──────────────────────────────────────────────────
  const { employeeCPP, employerCPP, employeeCPP2, employerCPP2 } = cpp;

  const netCashToOwner = Math.max(
    0,
    effectiveSalary + totalCash - employeeCPP - employeeCPP2 - totalPersonalTaxAfterCredits,
  );

  // ── 9. RRSP room ──────────────────────────────────────────────────────────
  const rrspRoomGenerated = Math.min(
    effectiveSalary * RRSP_EARNED_INCOME_RATE_2026,
    RRSP_DOLLAR_LIMIT_2026,
  );

  // ── 10. Totals ────────────────────────────────────────────────────────────
  const totalTaxBurden = Math.max(0, netCorporateIncomeBeforeTax - netCashToOwner);

  // ── 11. Effective rates ───────────────────────────────────────────────────
  const grossPersonalIncome      = effectiveSalary + totalCash;
  const effectivePersonalTaxRate = grossPersonalIncome > 0
    ? Math.round((totalPersonalTaxAfterCredits / grossPersonalIncome) * 100)
    : 0;
  const effectiveCorporateTaxRate = corporateTaxableIncome > 0
    ? Math.round((corpTaxResult.totalTax / corporateTaxableIncome) * 100)
    : 0;
  const integratedTaxRate = revenue > 0
    ? Math.round((totalTaxBurden / revenue) * 100)
    : 0;

  // ── 12. Backward-compat salary/dividend tax split (display only) ──────────
  const salaryOnlyTaxableIncome = Math.max(0, effectiveSalary + otherPersonalIncome - rrspDeduction);
  const salaryOnlyFederal = Math.max(
    0,
    progressiveTax(salaryOnlyTaxableIncome, FEDERAL_BRACKETS_2026) -
      Math.min(salaryOnlyTaxableIncome, FEDERAL_BPA_2026) * 0.15,
  );
  const salaryOnlyOntarioBasic = Math.max(
    0,
    progressiveTax(salaryOnlyTaxableIncome, ONTARIO_BRACKETS_2026) -
      Math.min(salaryOnlyTaxableIncome, ONTARIO_BPA_2026) * 0.0505,
  );
  const salaryOnlySurtax = calculateOntarioSurtax2026(salaryOnlyOntarioBasic);
  const salaryTax  = Math.max(0, salaryOnlyFederal + salaryOnlyOntarioBasic + salaryOnlySurtax);
  const dividendTax = Math.max(0, totalPersonalTaxAfterCredits - salaryTax);

  // Backward-compat: dividendType = dominant type (or nonEligible as fallback)
  const resolvedDividendType: DividendType =
    eligibleCash > nonEligibleCash ? "eligible" : "nonEligible";

  return {
    // Corporate
    netCorporateIncomeBeforeTax,
    employerCPP,
    employerCPP2,
    corporateTaxableIncome,
    corporateTaxFederal: corpTaxResult.federalTax,
    corporateTaxOntario: corpTaxResult.ontarioTax,
    totalCorporateTax:   corpTaxResult.totalTax,
    afterCorporateTaxIncome,
    availableDividendPool,

    // Dividend breakdown (new)
    dividendBreakdown: breakdown,

    // Dividend (backward-compat flat fields)
    dividendPaid:             totalCash,
    dividendType:             resolvedDividendType,
    dividendGrossUp:          totalGrossUpAmount,
    taxableDividendAmount:    totalTaxableAmount,
    federalDividendTaxCredit: totalFederalDTC,
    ontarioDividendTaxCredit: totalOntarioDTC,

    // CPP
    employeeCPP,
    employeeCPP2,

    // Personal tax
    personalTaxableIncome,
    federalTaxGross,
    personalTaxFederal,
    ontarioTaxGross,
    ontarioSurtax,
    personalTaxOntario,
    totalPersonalTaxAfterCredits,

    // Totals
    totalTaxBurden,
    netCashToOwner,
    retainedCorporateCash: 0,
    rrspRoomGenerated,

    // Rates
    effectivePersonalTaxRate,
    effectiveCorporateTaxRate,
    integratedTaxRate,

    // Backward-compat aliases
    afterTaxCorporateIncome: afterCorporateTaxIncome,
    corpTax:           corpTaxResult.totalTax,
    dividends:         totalCash,
    salaryTax,
    dividendTax,
    totalPersonalTax:  totalPersonalTaxAfterCredits,
    netPersonalCash:   netCashToOwner,
    grossPersonalIncome,
    effectiveTaxRate:  effectivePersonalTaxRate,
    cppDeduction:      employeeCPP,
    netCorpIncome:     corporateTaxableIncome,
    retainedEarnings:  0,

    warnings,
  };
}
