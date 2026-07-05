/**
 * Server-side financial document parser — CSV + XLSX
 *
 * Detects columns:
 *   CSV/XLSX shared: Description, Account Name, Category, Type,
 *                    Amount, Balance, Market Value, Notes
 *   XLSX-specific:   Mortgage Balance, Loan Balance, Credit Card Balance
 *
 * Each typed-balance column (Mortgage Balance, Loan Balance, Credit Card Balance)
 * automatically forces type = "liability" and pre-fills the matching category.
 *
 * Shared inference:
 *   - Asset/liability type: explicit Type column → negative amount → keyword
 *   - Category: explicit Category column → keyword mapping → "Other"
 *   - needsReview: set when type was inferred, not explicit
 */

import { createRequire } from "module";
import type * as XLSXTypes from "xlsx";

const _require = createRequire(`${process.cwd()}/package.json`);
let xlsxModule: typeof XLSXTypes | null = null;

function getXLSX(): typeof XLSXTypes {
  xlsxModule ??= _require("xlsx") as typeof XLSXTypes;
  return xlsxModule;
}

export type ItemType = "asset" | "liability";

export interface ParsedItem {
  tempId: string;
  name: string;
  category: string;
  type: ItemType;
  /** Whole dollars, always positive. */
  amount: number;
  notes: string;
  /** True when type, amount, or name is uncertain — user should double-check. */
  needsReview: boolean;
  /** Human-readable explanation of why needsReview is true. */
  reviewReason?: string;
  /**
   * Extraction confidence 0–1.
   * 1.0 = explicit column, 0.7 = inferred, 0.5 = scanned/guessed.
   */
  confidenceScore?: number;
  /** Raw text from the source document that produced this item. */
  sourceTextSnippet?: string;
}

export interface ColumnMap {
  // Shared
  description:      number;
  account:          number;
  category:         number;
  type:             number;
  amount:           number;
  balance:          number;
  value:            number;
  notes:            number;
  // XLSX-specific typed-balance columns
  mortgageBalance:    number;
  loanBalance:        number;
  creditCardBalance:  number;
}

export interface ParseResult {
  columns: ColumnMap;
  headers: string[];
  sheetName?: string;        // XLSX only
  items: ParsedItem[];
  warnings: string[];
  totalRows: number;
  skippedRows: number;
}

// ── Column alias tables ───────────────────────────────────────────────────────

const COLUMN_ALIASES: Record<keyof ColumnMap, string[]> = {
  description: [
    "description", "desc", "name", "payee", "merchant", "memo",
    "transaction description", "item", "label", "detail", "narrative",
  ],
  account: [
    "account name", "account", "account_name", "acct", "bank account",
    "institution", "institution name",
  ],
  category: [
    "category", "cat", "class", "classification",
    "expense category", "asset class", "account type", "account category",
  ],
  type: [
    "type", "transaction type", "txn type", "item type",
    "entry type", "record type", "asset type",
  ],
  amount: [
    "amount", "amt", "debit", "credit",
    "transaction amount", "payment amount", "withdrawal", "deposit",
  ],
  balance: [
    "balance", "running balance", "ending balance",
    "current balance", "closing balance", "account balance",
    "outstanding balance", "book value",
  ],
  value: [
    "market value", "value", "current value", "fair value",
    "market price", "estimated value", "appraisal",
    "estimated market value", "portfolio value",
  ],
  notes: [
    "notes", "note", "comment", "comments",
    "remarks", "description 2", "memo", "details",
  ],
  // Typed-balance columns — each implies type = liability
  mortgageBalance: [
    "mortgage balance", "mortgage amount", "mortgage owing",
    "home mortgage", "rental mortgage", "mortgage payable",
  ],
  loanBalance: [
    "loan balance", "loan amount", "loan owing",
    "student loan balance", "car loan balance", "auto loan balance",
    "personal loan balance", "business loan balance",
    "line of credit balance", "heloc balance", "loc balance",
    "shareholder loan balance",
  ],
  creditCardBalance: [
    "credit card balance", "credit card amount", "credit card owing",
    "visa balance", "mastercard balance", "amex balance",
    "card balance", "cc balance",
  ],
};

// ── Inference tables ──────────────────────────────────────────────────────────

const LIABILITY_LABEL_WORDS = [
  "mortgage", "loan", "debt", "credit card", "line of credit", "heloc",
  "overdraft", "payable", "owing", "student loan", "car loan", "auto loan",
  "credit line", "tax payable", "shareholder loan payable",
];

const LIABILITY_TYPE_WORDS = [
  "liability", "debt", "credit card", "loan", "mortgage", "payable",
  "owe", "debit", "overdraft",
];

const CATEGORY_MAP: Array<{ words: string[]; category: string }> = [
  { words: ["rrsp", "tfsa", "fhsa", "resp", "lira", "rrif"],
    category: "Registered Accounts" },
  { words: ["stock", "etf", "bond", "mutual fund", "investment", "portfolio",
             "brokerage", "equity", "securities"],
    category: "Investments" },
  { words: ["chequing", "checking", "savings", "high interest", "hisa"],
    category: "Bank Accounts" },
  { words: ["pension", "cpp", "retirement", "defined benefit", "group rrsp"],
    category: "Pension & Retirement" },
  { words: ["real estate", "property", "home", "house", "condo", "rental",
             "land", "cottage"],
    category: "Real Estate" },
  { words: ["vehicle", "car", "truck", "automobile", "boat", "motorcycle"],
    category: "Vehicles" },
  { words: ["mortgage"],
    category: "Mortgages" },
  { words: ["credit card", "visa", "mastercard", "amex", "american express"],
    category: "Credit Cards" },
  { words: ["student loan", "osap", "student debt"],
    category: "Student Loans" },
  { words: ["car loan", "auto loan", "vehicle loan", "line of credit",
             "heloc", "personal loan", "business loan"],
    category: "Loans & Lines of Credit" },
  { words: ["tax", "tax payable", "cra", "revenue canada"],
    category: "Taxes Owing" },
  { words: ["receivable", "owed to me", "money owed"],
    category: "Receivables" },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function tempId(): string {
  return Math.random().toString(36).slice(2, 10);
}

/**
 * Normalise a header string for alias matching:
 * lowercase, strip non-alphanumeric (except space), collapse whitespace.
 */
function normaliseHeader(h: string): string {
  return h.toLowerCase().replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();
}

/**
 * Map an array of header strings to a ColumnMap of column indices.
 *
 * Strategy:
 *  1. Typed-balance columns (Mortgage Balance, Loan Balance, Credit Card Balance)
 *     are resolved FIRST and their indices marked as "claimed".
 *  2. Remaining columns search only unclaimed indices.
 *  3. Within each search: exact match → long-alias contains (≥5 chars) → word-exact.
 *
 * This prevents short aliases like "credit" (in the Amount aliases) from accidentally
 * claiming the "Credit Card Balance" column before the typed-balance pass runs.
 */
export function detectColumns(headers: string[]): ColumnMap {
  const norm = headers.map(normaliseHeader);
  const claimed = new Set<number>();

  function find(aliases: string[]): number {
    const sorted = [...aliases].sort((a, b) => b.length - a.length);

    // Pass 1: exact match (any alias length, unclaimed only)
    for (const alias of sorted) {
      const idx = norm.findIndex((h, i) => !claimed.has(i) && h === alias);
      if (idx !== -1) { claimed.add(idx); return idx; }
    }

    // Pass 2: substring match for longer aliases (≥5 chars), unclaimed only
    for (const alias of sorted) {
      if (alias.length >= 5) {
        const idx = norm.findIndex((h, i) => !claimed.has(i) && h.includes(alias));
        if (idx !== -1) { claimed.add(idx); return idx; }
      }
    }

    // Pass 3: exact match for short aliases (<5 chars) — must be the entire header
    // (no word-boundary partial match to avoid "name" claiming "Account Name")
    for (const alias of sorted) {
      if (alias.length < 5) {
        const idx = norm.findIndex((h, i) => !claimed.has(i) && h === alias);
        if (idx !== -1) { claimed.add(idx); return idx; }
      }
    }

    return -1;
  }

  // ── Resolve typed-balance columns FIRST so they can't be claimed by generic columns ──
  const mortgageBalance   = find(COLUMN_ALIASES.mortgageBalance);
  const loanBalance       = find(COLUMN_ALIASES.loanBalance);
  const creditCardBalance = find(COLUMN_ALIASES.creditCardBalance);

  return {
    description:     find(COLUMN_ALIASES.description),
    account:         find(COLUMN_ALIASES.account),
    category:        find(COLUMN_ALIASES.category),
    type:            find(COLUMN_ALIASES.type),
    amount:          find(COLUMN_ALIASES.amount),
    balance:         find(COLUMN_ALIASES.balance),
    value:           find(COLUMN_ALIASES.value),
    notes:           find(COLUMN_ALIASES.notes),
    mortgageBalance,
    loanBalance,
    creditCardBalance,
  };
}

/**
 * Parse a currency string into a whole-dollar integer.
 * Handles: $1,234.56  (1,000.00)  -500  1.5k  CAD 200  etc.
 * Returns NaN if the string is not parseable.
 */
export function parseAmount(raw: string): number {
  if (!raw && raw !== "0") return NaN;
  let s = String(raw).trim();

  // Parentheses → negative  e.g. (1,234.56) → -1234.56
  if (s.startsWith("(") && s.endsWith(")")) s = "-" + s.slice(1, -1);

  // Strip currency symbols, commas, spaces
  s = s.replace(/[$CAD€£¥,\s]/g, "");

  // k shorthand  e.g. 150k → 150000
  if (/^-?\d+(\.\d+)?k$/i.test(s)) {
    return Math.round(parseFloat(s) * 1000);
  }

  const n = parseFloat(s);
  return isNaN(n) ? NaN : Math.round(n);
}

/** Classify a label string as "asset" or "liability" via keyword list. */
export function classifyLabel(text: string): ItemType {
  const l = text.toLowerCase();
  for (const w of LIABILITY_LABEL_WORDS) {
    if (l.includes(w)) return "liability";
  }
  return "asset";
}

/** Resolve type from an explicit Type-column cell value. Returns null if unrecognised. */
function resolveTypeFromColumn(raw: string): ItemType | null {
  const l = raw.toLowerCase().trim();
  if (l === "asset") return "asset";
  for (const w of LIABILITY_TYPE_WORDS) {
    if (l.includes(w)) return "liability";
  }
  return null;
}

/** Map label + type text to a friendly category string via keyword table. */
export function inferCategoryExported(text: string): string {
  const l = text.toLowerCase();
  for (const { words, category } of CATEGORY_MAP) {
    if (words.some(w => l.includes(w))) return category;
  }
  return "Other";
}

// ── Typed-balance column metadata ─────────────────────────────────────────────
// When a row gets its amount from one of these columns, type and category are
// pre-determined — no further inference needed.

interface TypedBalanceSpec {
  colKey: "mortgageBalance" | "loanBalance" | "creditCardBalance";
  forcedType: ItemType;
  forcedCategory: string;
}

const TYPED_BALANCE_SPECS: TypedBalanceSpec[] = [
  { colKey: "mortgageBalance",    forcedType: "liability", forcedCategory: "Mortgages" },
  { colKey: "loanBalance",        forcedType: "liability", forcedCategory: "Loans & Lines of Credit" },
  { colKey: "creditCardBalance",  forcedType: "liability", forcedCategory: "Credit Cards" },
];

// ── Shared row processor ──────────────────────────────────────────────────────

interface RowProcessorOptions {
  cols: ColumnMap;
  headers: string[];
  dataRows: string[][];
}

function processRows({ cols, headers, dataRows }: RowProcessorOptions): {
  items: ParsedItem[];
  skipped: number;
  warnings: string[];
} {
  const items: ParsedItem[] = [];
  let skipped = 0;
  const warnings: string[] = [];

  // Check for critical columns
  const hasAnyAmountCol =
    cols.amount >= 0 || cols.balance >= 0 || cols.value >= 0 ||
    cols.mortgageBalance >= 0 || cols.loanBalance >= 0 || cols.creditCardBalance >= 0;

  if (!hasAnyAmountCol) {
    warnings.push(
      "No amount column (Amount, Balance, Market Value, Mortgage Balance, Loan Balance, or Credit Card Balance) was found. " +
      "Rows with a detectable number will still be imported."
    );
  }
  if (cols.description < 0 && cols.account < 0) {
    warnings.push("No Description or Account Name column found — using the first column as the item name.");
  }

  for (const row of dataRows) {
    const cell = (idx: number) => (idx >= 0 ? String(row[idx] ?? "").trim() : "");

    // ── Name ──
    let name = cols.description >= 0 ? cell(cols.description)
             : cols.account     >= 0 ? cell(cols.account)
             : cell(0);

    // Append account name when both description and account columns exist
    if (cols.account >= 0 && cols.description >= 0) {
      const acct = cell(cols.account);
      if (acct && acct.toLowerCase() !== name.toLowerCase()) {
        name = name ? `${name} — ${acct}` : acct;
      }
    }

    if (!name) { skipped++; continue; }

    // ── Amount resolution ──
    // Priority: explicit Amount → typed-balance columns → Balance → Value → scan
    let rawAmt = "";
    let forcedType: ItemType | null = null;
    let forcedCategory: string | null = null;
    let amountWasScanned = false;

    if (cols.amount >= 0 && cell(cols.amount)) {
      rawAmt = cell(cols.amount);
    } else {
      // Try typed-balance columns in defined order
      for (const spec of TYPED_BALANCE_SPECS) {
        const idx = cols[spec.colKey];
        if (idx >= 0 && cell(idx)) {
          rawAmt = cell(idx);
          forcedType = spec.forcedType;
          // Only pre-fill category if no explicit category column
          if (cols.category < 0) forcedCategory = spec.forcedCategory;
          break;
        }
      }
    }

    // Fall back to balance → value
    if (!rawAmt && cols.balance >= 0) rawAmt = cell(cols.balance);
    if (!rawAmt && cols.value   >= 0) rawAmt = cell(cols.value);

    // Last resort: scan all columns for the first numeric-looking value
    if (!rawAmt) {
      for (let ci = 0; ci < row.length; ci++) {
        const cleaned = String(row[ci] ?? "").replace(/[$,\s()]/g, "");
        if (!isNaN(parseFloat(cleaned)) && cleaned !== "") {
          rawAmt = String(row[ci] ?? "");
          amountWasScanned = true;
          break;
        }
      }
    }

    const amount = parseAmount(rawAmt);
    if (isNaN(amount) || rawAmt === "") { skipped++; continue; }

    // ── Type ──
    let type: ItemType;
    if (forcedType) {
      type = forcedType;
    } else {
      const rawTypeCell = cell(cols.type);
      const fromCol = rawTypeCell ? resolveTypeFromColumn(rawTypeCell) : null;
      type = fromCol ?? (amount < 0 ? "liability" : classifyLabel(name));
      if (!fromCol) forcedType = null; // still inferred
    }

    // ── Category ──
    let category = forcedCategory ?? cell(cols.category);
    if (!category) {
      category = inferCategoryExported(`${name} ${cell(cols.type)}`);
    }

    // ── Notes ──
    const notes = cell(cols.notes);

    // ── needsReview — collect all reasons ─────────────────────────────────────
    const typeWasExplicit = forcedType !== null || (cols.type >= 0 && !!cell(cols.type) && resolveTypeFromColumn(cell(cols.type)) !== null);
    const absAmount = Math.abs(amount);

    const reasons: string[] = [];
    if (!typeWasExplicit)      reasons.push("Type inferred from name — verify it's correct");
    if (amountWasScanned)      reasons.push("Amount guessed from row data — verify the value");
    if (absAmount === 0)       reasons.push("Amount is zero — enter the correct value");
    if (absAmount > 5_000_000) reasons.push("Unusually large amount — double-check");
    if (name.length <= 2)      reasons.push("Item name is too short — add a description");

    // ── Confidence score (0–1) ─────────────────────────────────────────────────
    const confidenceScore = typeWasExplicit && !amountWasScanned ? 0.95
      : typeWasExplicit && amountWasScanned                     ? 0.75
      : amountWasScanned                                         ? 0.55
      :                                                            0.65;

    // ── Source snippet — join non-empty row cells ──────────────────────────────
    const sourceTextSnippet = row
      .map(c => String(c ?? "").trim())
      .filter(Boolean)
      .join(" | ")
      .slice(0, 120);

    items.push({
      tempId: tempId(),
      name,
      category,
      type,
      amount: absAmount,
      notes,
      needsReview: reasons.length > 0,
      reviewReason: reasons[0],
      confidenceScore,
      sourceTextSnippet,
    });
  }

  if (items.length === 0 && dataRows.length > 0) {
    warnings.push("No rows could be parsed. Check that the file has a name column and at least one amount column.");
  }

  return { items, skipped, warnings };
}

// ── CSV tokenizer ─────────────────────────────────────────────────────────────

/**
 * RFC 4180-compliant CSV tokenizer.
 * Auto-detects delimiter (comma, tab, semicolon).
 * Handles quoted fields, embedded newlines, and UTF-8 BOM.
 */
export function tokenizeCSV(raw: string): string[][] {
  const text = raw.startsWith("\uFEFF") ? raw.slice(1) : raw;

  const firstLine = text.split(/\r?\n/)[0] ?? "";
  const delimiter =
    firstLine.includes("\t") ? "\t"
    : firstLine.includes(";") ? ";"
    : ",";

  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  let i = 0;

  while (i < text.length) {
    const ch = text[i];

    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') { field += '"'; i += 2; continue; }
        inQuotes = false; i++; continue;
      }
      field += ch; i++; continue;
    }

    if (ch === '"')       { inQuotes = true; i++; continue; }
    if (ch === delimiter) { row.push(field.trim()); field = ""; i++; continue; }

    if (ch === "\r" || ch === "\n") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(field.trim());
      field = "";
      if (row.some(c => c !== "")) rows.push(row);
      row = [];
      i++;
      continue;
    }

    field += ch; i++;
  }

  row.push(field.trim());
  if (row.some(c => c !== "")) rows.push(row);

  return rows;
}

// ── Public parsers ────────────────────────────────────────────────────────────

/** Parse a CSV buffer into reviewable ParsedItems. */
export function parseCSVBuffer(buf: Buffer): ParseResult {
  const raw = buf.toString("utf-8");
  const rows = tokenizeCSV(raw);

  if (rows.length === 0) {
    return {
      columns: detectColumns([]), headers: [], items: [],
      warnings: ["The file appears to be empty."], totalRows: 0, skippedRows: 0,
    };
  }

  const headers = rows[0];
  const cols = detectColumns(headers);
  const dataRows = rows.slice(1);

  const { items, skipped, warnings } = processRows({ cols, headers, dataRows });

  return { columns: cols, headers, items, warnings, totalRows: dataRows.length, skippedRows: skipped };
}

/** Parse an XLSX buffer into reviewable ParsedItems using the first sheet. */
export function parseXLSXBuffer(buf: Buffer): ParseResult {
  const XLSX = getXLSX();
  let wb: XLSXTypes.WorkBook;
  try {
    wb = XLSX.read(buf, { type: "buffer", cellDates: false });
  } catch {
    return {
      columns: detectColumns([]), headers: [], items: [],
      warnings: ["The file could not be opened. Make sure it is a valid .xlsx or .xls spreadsheet."],
      totalRows: 0, skippedRows: 0,
    };
  }

  if (!wb.SheetNames.length) {
    return {
      columns: detectColumns([]), headers: [], items: [],
      warnings: ["The workbook contains no sheets."], totalRows: 0, skippedRows: 0,
    };
  }

  const sheetName = wb.SheetNames[0];
  const ws = wb.Sheets[sheetName];

  // sheet_to_json with header:1 gives string[][] (defval fills blanks)
  const rawRows: unknown[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });

  if (rawRows.length === 0) {
    return {
      columns: detectColumns([]), headers: [], sheetName, items: [],
      warnings: [`Sheet "${sheetName}" is empty.`], totalRows: 0, skippedRows: 0,
    };
  }

  // Convert all cells to trimmed strings
  const stringRows: string[][] = rawRows.map(r =>
    (r as unknown[]).map(c => String(c ?? "").trim())
  );

  // Skip leading rows that look like a title (no recognisable headers) — try up to 5
  let headerRowIdx = 0;
  for (let ri = 0; ri < Math.min(5, stringRows.length); ri++) {
    const normRow = stringRows[ri].map(normaliseHeader);
    const hasRecognisedHeader = normRow.some(h =>
      Object.values(COLUMN_ALIASES).flat().some(alias => h === alias || h.includes(alias))
    );
    if (hasRecognisedHeader) { headerRowIdx = ri; break; }
  }

  const headers = stringRows[headerRowIdx];
  const cols = detectColumns(headers);
  const dataRows = stringRows.slice(headerRowIdx + 1).filter(r => r.some(c => c !== ""));

  if (dataRows.length === 0) {
    return {
      columns: cols, headers, sheetName, items: [],
      warnings: [`Sheet "${sheetName}" has no data rows.`], totalRows: 0, skippedRows: 0,
    };
  }

  const { items, skipped, warnings } = processRows({ cols, headers, dataRows });

  return {
    columns: cols,
    headers,
    sheetName,
    items,
    warnings,
    totalRows: dataRows.length,
    skippedRows: skipped,
  };
}
