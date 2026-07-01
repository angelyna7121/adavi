/**
 * 2026 Ontario CCPC Owner-Manager Tax Constants
 *
 * Sources:
 * - CRA corporate tax rates (federal SBD = 9%, general = 15%)
 * - Ontario 2026 Budget Annex (Ontario SBD 3.2% → 2.2% eff. July 1, 2026; general = 11.5%)
 * - CRA CPP contribution rates (2026 estimated from confirmed 2025 trend)
 * - CRA personal tax brackets (2026 thresholds estimated with ~2.7% indexation from 2025)
 * - Dividend gross-up and DTC rates are statutory (unchanged from 2024/2025)
 * - RRSP dollar limit: 2025 confirmed at $32,490; 2026 may be indexed higher
 *
 * These are planning estimates. Always verify with CRA announcements and consult a CPA.
 */

export interface TaxBracket {
  upTo: number;
  rate: number;
}

// ─── Federal Personal Income Tax (2026, estimated) ────────────────────────────
// Thresholds indexed ~2.7% from confirmed 2025 values
export const FEDERAL_BRACKETS_2026: TaxBracket[] = [
  { upTo: 57_375,    rate: 0.15   },
  { upTo: 114_750,   rate: 0.205  },
  { upTo: 177_882,   rate: 0.26   },
  { upTo: 253_414,   rate: 0.29   },
  { upTo: Infinity,  rate: 0.33   },
];

// Federal Basic Personal Amount (2026 estimated — 2025 confirmed = $16,129)
export const FEDERAL_BPA_2026 = 16_129;

// ─── Ontario Personal Income Tax (2026, estimated) ───────────────────────────
// Thresholds indexed ~2.3% from confirmed 2025 values
export const ONTARIO_BRACKETS_2026: TaxBracket[] = [
  { upTo: 51_446,    rate: 0.0505 },
  { upTo: 102_894,   rate: 0.0915 },
  { upTo: 150_000,   rate: 0.1116 },
  { upTo: 220_000,   rate: 0.1216 },
  { upTo: Infinity,  rate: 0.1316 },
];

// Ontario Basic Personal Amount (2026 estimated from 2025 ~$11,865 → ~$12,399)
export const ONTARIO_BPA_2026 = 12_399;

// Ontario Surtax thresholds (2026 estimated, indexed from 2025)
export const ONTARIO_SURTAX_THRESHOLD_1_2026 = 5_315;
export const ONTARIO_SURTAX_RATE_1_2026      = 0.20;  // 20% on Ontario tax over threshold 1
export const ONTARIO_SURTAX_THRESHOLD_2_2026 = 6_802;
export const ONTARIO_SURTAX_RATE_2_2026      = 0.36;  // additional 36% on Ontario tax over threshold 2

// ─── CPP 2026 (estimated) ─────────────────────────────────────────────────────
// 2025 confirmed: YMPE $71,300 / YAMPE $81,900; applying ~2.7% indexation for 2026
export const CPP_BASIC_EXEMPTION_2026        = 3_500;   // unchanged for many years
export const CPP_YMPE_2026                   = 73_200;  // estimated (2025 = $71,300)
export const CPP_YAMPE_2026                  = 83_900;  // estimated (2025 = $81,900)
export const CPP_BASE_EMPLOYEE_RATE_2026     = 0.0595;  // 5.95% employee
export const CPP_BASE_EMPLOYER_RATE_2026     = 0.0595;  // 5.95% employer
export const CPP2_EMPLOYEE_RATE_2026         = 0.04;    // 4.0% CPP2 employee (YMPE → YAMPE)
export const CPP2_EMPLOYER_RATE_2026         = 0.04;    // 4.0% CPP2 employer

// ─── Corporate Tax (Ontario CCPC, 2026) ──────────────────────────────────────
export const CORP_FEDERAL_SBD_RATE_2026          = 0.09;    // 9% (confirmed)
export const CORP_FEDERAL_GENERAL_RATE_2026      = 0.15;    // 15% (confirmed)
export const CORP_ONTARIO_SBD_RATE_H1_2026       = 0.032;   // 3.2% Jan 1 – Jun 30, 2026
export const CORP_ONTARIO_SBD_RATE_H2_2026       = 0.022;   // 2.2% Jul 1 – Dec 31, 2026 (announced)
export const CORP_ONTARIO_GENERAL_RATE_2026      = 0.115;   // 11.5% (confirmed)
export const CORP_SBD_LIMIT_2026                 = 500_000; // $500,000 active business income
export const CORP_TAXABLE_CAPITAL_GRIND_START    = 10_000_000;
export const CORP_TAXABLE_CAPITAL_GRIND_END      = 50_000_000;

// ─── Dividend Gross-Up and DTC (2026, statutory — unchanged from 2024/2025) ───
// Non-eligible dividends (typical for CCPC SBD income):
export const NON_ELIGIBLE_GROSS_UP_RATE_2026         = 0.15;
export const NON_ELIGIBLE_FEDERAL_DTC_RATE_2026      = 0.090301; // of grossed-up dividend
export const NON_ELIGIBLE_ONTARIO_DTC_RATE_2026      = 0.033283; // of grossed-up dividend

// Eligible dividends (requires GRIP / general-rate income):
export const ELIGIBLE_GROSS_UP_RATE_2026             = 0.38;
export const ELIGIBLE_FEDERAL_DTC_RATE_2026          = 0.150198; // of grossed-up dividend
export const ELIGIBLE_ONTARIO_DTC_RATE_2026          = 0.100;    // of grossed-up dividend

// ─── RRSP 2026 ────────────────────────────────────────────────────────────────
export const RRSP_EARNED_INCOME_RATE_2026  = 0.18;    // 18% of earned income
export const RRSP_DOLLAR_LIMIT_2026        = 32_490;  // 2025 confirmed; 2026 may be higher
