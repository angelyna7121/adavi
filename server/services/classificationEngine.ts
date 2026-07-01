/**
 * server/services/classificationEngine.ts
 *
 * Single source of truth for classifying financial items into:
 *   - type:     "asset" | "liability"
 *   - category: canonical category string
 *
 * Rules applied in strict priority order (most specific first):
 *   1. ASSET overrides  — investments, mortgage investments, shareholder advances
 *   2. LIABILITY overrides — debts, mortgage debt, shareholder loan payable
 *   3. Keyword inference — broad label scanning
 *   4. suggestedType fallback — use the caller's hint, default "asset"
 *
 * Entry point:
 *   classifyItem(name, category?, suggestedType?) → { type, category }
 *
 * Called before every NetWorthItem insert/update so rules are always enforced.
 */

export type ItemType = "asset" | "liability";

export interface ClassifiedItem {
  type: ItemType;
  category: string;
  /**
   * True when the engine overrode the caller's `suggestedType`.
   * Callers should set needsReview when this is true.
   */
  typeConflict: boolean;
}

// ── Canonical category values ─────────────────────────────────────────────────
// Keep in sync with the AI prompt's category list and the frontend display names.

export const CATEGORIES = {
  // Assets
  Cash:               "Cash",
  Savings:            "Savings",
  BankAccount:        "Bank Accounts",
  TFSA:               "TFSA",
  RRSP:               "RRSP",
  FHSA:               "FHSA",
  RESP:               "RESP",
  RRIF:               "RRIF",
  LIRA:               "LIRA",
  GIC:                "GIC",
  Stocks:             "Stocks",
  ETFs:               "ETFs",
  MutualFunds:        "Mutual Funds",
  Bonds:              "Bonds",
  Investments:        "Investments",
  Crypto:             "Cryptocurrency",
  PreciousMetals:     "Precious Metals",
  BusinessOwnership:  "Business Ownership",
  CorporationShares:  "Corporation Shares",
  RealEstate:         "Real Estate",
  InvestmentProperty: "Investment Property",
  Vehicles:           "Vehicles",
  MortgageInvestment: "Mortgage Investment",
  PrivateLending:     "Private Lending",
  Receivables:        "Receivables",
  Pension:            "Pension & Retirement",
  // Liabilities
  MortgageDebt:       "Mortgage Debt",
  CreditCard:         "Credit Cards",
  Loan:               "Loans & Lines of Credit",
  CarLoan:            "Car Loan",
  StudentLoan:        "Student Loans",
  BusinessLoan:       "Business Loan",
  TaxPayable:         "Taxes Owing",
  Other:              "Other",
} as const;

// ── Rule tables ───────────────────────────────────────────────────────────────

/**
 * Rules that unconditionally force type = "asset".
 * Checked before any liability rules.
 * Each entry: { patterns, category }
 * A label matches if it includes ANY of the patterns (case-insensitive).
 */
const ASSET_OVERRIDES: Array<{ patterns: string[]; category: string }> = [
  // Shareholder advances (receivable FROM shareholder) — explicitly an asset
  { patterns: ["shareholder advance", "shareholders advance",
               "advance to shareholder", "advances to shareholder",
               "due from shareholder", "due from director",
               "advance receivable", "due from related"],
    category: CATEGORIES.Receivables },

  // Mortgage investments / MIC / private lending (asset, not debt)
  { patterns: ["mortgage investment", "mortgage fund", "mortgage corporation",
               "mic fund", "private mortgage", "mortgage reit",
               "mortgage receivable", "mortgage lent"],
    category: CATEGORIES.MortgageInvestment },

  // Private lending / notes receivable
  { patterns: ["private lending", "note receivable", "notes receivable",
               "loan receivable", "loans receivable", "promissory note receivable"],
    category: CATEGORIES.PrivateLending },

  // Registered accounts — always assets
  { patterns: ["rrsp", "rrif"], category: CATEGORIES.RRSP },
  { patterns: ["tfsa"],         category: CATEGORIES.TFSA },
  { patterns: ["fhsa"],         category: CATEGORIES.FHSA },
  { patterns: ["resp"],         category: CATEGORIES.RESP },
  { patterns: ["lira"],         category: CATEGORIES.LIRA },

  // GICs
  { patterns: ["gic", "guaranteed investment", "term deposit"],
    category: CATEGORIES.GIC },

  // Brokerage / investment accounts — any investment is an asset
  { patterns: ["investment account", "brokerage account", "portfolio",
               "equity portfolio", "stock portfolio", "trading account",
               "wealthsimple", "questrade", "fidelity account",
               "td direct invest", "rbc direct invest", "nbdb", "itrade"],
    category: CATEGORIES.Investments },

  // Pension / retirement — always assets
  { patterns: ["pension", "defined benefit", "cpp", "group rrsp", "deferred profit"],
    category: CATEGORIES.Pension },

  // Corporation / business ownership
  { patterns: ["corporation shares", "corp shares", "company shares",
               "business ownership", "ownership stake", "equity interest",
               "shares in", "common shares", "preferred shares", "holdco"],
    category: CATEGORIES.CorporationShares },

  // Receivables — money owed to the person
  { patterns: ["receivable", "owed to me", "money owed to", "due from"],
    category: CATEGORIES.Receivables },
];

/**
 * Rules that unconditionally force type = "liability".
 * Checked after ASSET_OVERRIDES — if an item already matched an asset rule above, it won't reach here.
 */
const LIABILITY_OVERRIDES: Array<{ patterns: string[]; category: string }> = [
  // Mortgage debt (home/rental mortgage balance) — liability
  { patterns: ["mortgage payable", "mortgage balance", "mortgage debt",
               "home mortgage", "rental mortgage", "property mortgage",
               "outstanding mortgage", "mortgage owing"],
    category: CATEGORIES.MortgageDebt },

  // Shareholder loan payable (company owes shareholder) — liability
  { patterns: ["shareholder loan payable", "due to shareholder",
               "due to director", "loan from shareholder",
               "shareholder loan", "director loan", "related party loan"],
    category: CATEGORIES.Loan },

  // Credit cards
  { patterns: ["credit card", "visa", "mastercard", "amex", "american express",
               "discover card", "card balance", "card payable"],
    category: CATEGORIES.CreditCard },

  // Lines of credit & HELOCs
  { patterns: ["line of credit", "loc ", "heloc", "home equity line",
               "personal line", "business line of credit", "revolving credit"],
    category: CATEGORIES.Loan },

  // Car / auto loans
  { patterns: ["car loan", "auto loan", "vehicle loan", "automobile loan"],
    category: CATEGORIES.CarLoan },

  // Student loans
  { patterns: ["student loan", "osap", "student debt", "education loan"],
    category: CATEGORIES.StudentLoan },

  // Business loans
  { patterns: ["business loan", "commercial loan", "sba loan", "bdc loan",
               "term loan", "operating loan"],
    category: CATEGORIES.BusinessLoan },

  // Tax payable
  { patterns: ["tax payable", "taxes payable", "income tax payable",
               "hst payable", "gst payable", "cra", "revenue canada",
               "tax owing", "taxes owing"],
    category: CATEGORIES.TaxPayable },

  // Generic debt keywords — broad catch-all liability
  { patterns: ["loan payable", "note payable", "notes payable",
               "overdraft", "payable to", "debt owed"],
    category: CATEGORIES.Loan },
];

// ── Broad keyword inference (lower priority) ───────────────────────────────────

const BROAD_ASSET_KEYWORDS = [
  "cash", "chequing", "checking", "savings", "hisa", "high interest",
  "stock", "etf", "bond", "mutual fund", "index fund", "fund",
  "investment", "equity", "securities", "crypto", "bitcoin", "ethereum",
  "gold", "silver", "precious metal",
  "real estate", "property", "home value", "house value", "condo value",
  "cottage", "land value",
  "vehicle", "car value", "truck value", "automobile value", "boat",
  "asset", "balance", "account balance", "deposit",
];

const BROAD_LIABILITY_KEYWORDS = [
  "debt", "loan", "mortgage", "payable", "owing", "owe",
  "liability", "credit card", "overdraft", "line of credit",
  "student loan", "car loan", "auto loan", "tax payable",
  "balance owing", "amount owed", "outstanding balance",
];

// ── Category inference (broad) ─────────────────────────────────────────────────

const BROAD_CATEGORY_MAP: Array<{ words: string[]; category: string; type?: ItemType }> = [
  { words: ["rrsp", "rrif"],       category: CATEGORIES.RRSP,               type: "asset" },
  { words: ["tfsa"],               category: CATEGORIES.TFSA,               type: "asset" },
  { words: ["fhsa"],               category: CATEGORIES.FHSA,               type: "asset" },
  { words: ["resp"],               category: CATEGORIES.RESP,               type: "asset" },
  { words: ["lira"],               category: CATEGORIES.LIRA,               type: "asset" },
  { words: ["gic", "term deposit", "guaranteed investment"],
                                   category: CATEGORIES.GIC,                type: "asset" },
  { words: ["stock", "etf", "mutual fund", "index fund", "bond", "securities", "equity",
             "brokerage", "portfolio", "investment", "wealthsimple", "questrade"],
                                   category: CATEGORIES.Investments,        type: "asset" },
  { words: ["chequing", "checking", "savings", "hisa", "high interest"],
                                   category: CATEGORIES.BankAccount,        type: "asset" },
  { words: ["cash"],               category: CATEGORIES.Cash,               type: "asset" },
  { words: ["pension", "cpp", "retirement", "defined benefit"],
                                   category: CATEGORIES.Pension,            type: "asset" },
  { words: ["crypto", "bitcoin", "ethereum", "digital asset", "nft"],
                                   category: CATEGORIES.Crypto,             type: "asset" },
  { words: ["gold", "silver", "precious metal"],
                                   category: CATEGORIES.PreciousMetals,     type: "asset" },
  { words: ["real estate", "property", "home", "house", "condo", "land", "cottage", "rental property", "investment property"],
                                   category: CATEGORIES.RealEstate,         type: "asset" },
  { words: ["vehicle", "car", "truck", "automobile", "boat", "motorcycle"],
                                   category: CATEGORIES.Vehicles,           type: "asset" },
  { words: ["mortgage investment", "mic", "private mortgage"],
                                   category: CATEGORIES.MortgageInvestment, type: "asset" },
  { words: ["private lending", "note receivable"],
                                   category: CATEGORIES.PrivateLending,     type: "asset" },
  { words: ["corporation", "shares", "holdco", "business ownership"],
                                   category: CATEGORIES.CorporationShares,  type: "asset" },
  { words: ["receivable"],         category: CATEGORIES.Receivables,        type: "asset" },
  // Liabilities
  { words: ["mortgage"],           category: CATEGORIES.MortgageDebt,       type: "liability" },
  { words: ["credit card", "visa", "mastercard", "amex"],
                                   category: CATEGORIES.CreditCard,         type: "liability" },
  { words: ["student loan", "osap"],
                                   category: CATEGORIES.StudentLoan,        type: "liability" },
  { words: ["car loan", "auto loan", "vehicle loan"],
                                   category: CATEGORIES.CarLoan,            type: "liability" },
  { words: ["line of credit", "heloc", "loc"],
                                   category: CATEGORIES.Loan,               type: "liability" },
  { words: ["business loan", "term loan", "commercial loan"],
                                   category: CATEGORIES.BusinessLoan,       type: "liability" },
  { words: ["tax payable", "cra", "taxes owing"],
                                   category: CATEGORIES.TaxPayable,         type: "liability" },
  { words: ["loan", "debt", "payable", "owing"],
                                   category: CATEGORIES.Loan,               type: "liability" },
];

// ── Main entry point ──────────────────────────────────────────────────────────

/**
 * Classify a financial item into { type, category }.
 *
 * @param name          Label / account name from the source document
 * @param category      Optional category hint (from AI or CSV column)
 * @param suggestedType Optional type hint (from AI model or user column)
 */
export function classifyItem(
  name: string,
  category?: string,
  suggestedType?: string,
): ClassifiedItem {
  const label = norm(name);
  const catHint = norm(category ?? "");
  const hint = suggestedType === "liability" ? "liability" : suggestedType === "asset" ? "asset" : undefined;

  // ── 1. Hard asset overrides (most specific, highest priority) ─────────────
  for (const rule of ASSET_OVERRIDES) {
    if (rule.patterns.some(p => label.includes(p) || catHint.includes(p))) {
      return { type: "asset", category: rule.category, typeConflict: hint === "liability" };
    }
  }

  // ── 2. Hard liability overrides ───────────────────────────────────────────
  for (const rule of LIABILITY_OVERRIDES) {
    if (rule.patterns.some(p => label.includes(p) || catHint.includes(p))) {
      return { type: "liability", category: rule.category, typeConflict: hint === "asset" };
    }
  }

  // ── 3. Broad category inference ───────────────────────────────────────────
  for (const entry of BROAD_CATEGORY_MAP) {
    if (entry.words.some(w => label.includes(w) || catHint.includes(w))) {
      const resolvedType = entry.type ?? inferFromKeywords(label);
      return {
        type: resolvedType,
        category: entry.category,
        typeConflict: hint !== undefined && hint !== resolvedType,
      };
    }
  }

  // ── 4. Fallback: broad keyword type + suggestedType hint ──────────────────
  const inferredType = inferFromKeywords(label)
    ?? (suggestedType === "liability" ? "liability" : "asset");

  const inferredCategory = suggestedType === "liability"
    ? CATEGORIES.Loan
    : CATEGORIES.Other;

  return { type: inferredType, category: inferredCategory, typeConflict: false };
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function norm(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();
}

function inferFromKeywords(label: string): ItemType {
  for (const w of BROAD_LIABILITY_KEYWORDS) {
    if (label.includes(w)) return "liability";
  }
  for (const w of BROAD_ASSET_KEYWORDS) {
    if (label.includes(w)) return "asset";
  }
  return "asset";
}
