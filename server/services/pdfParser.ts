/**
 * PDF text extraction + financial-item parser
 *
 * Uses pdfjs-dist in workerless Node mode to pull embedded text from a PDF buffer.
 * If the PDF is image-only (scanned) we attempt OCR via ocrParser.
 * If OCR also yields no text, the result explains the limitation to the user.
 *
 * Parsing strategy:
 *  1. Split extracted text into lines.
 *  2. Track current section context (Assets / Liabilities / Unknown) via
 *     header-line detection.
 *  3. For each non-header line that contains a currency amount, extract a
 *     label + amount and produce a ParsedItem.
 *  4. Skip subtotals / grand totals / net-worth summary lines.
 *  5. All items are flagged needsReview=true — PDF layout varies widely.
 */

import type { ParsedItem, ParseResult } from "./csvParser.js";
import { classifyLabel, inferCategoryExported as inferCategory, parseAmount } from "./csvParser.js";
import { ocrScannedPdfBuffer } from "./ocrParser.js";

type PdfJsModule = {
  GlobalWorkerOptions: { workerSrc: string };
  getDocument: (options: Record<string, unknown>) => {
    promise: Promise<{
      numPages: number;
      getPage: (pageNumber: number) => Promise<{
        getTextContent: (options?: Record<string, unknown>) => Promise<{ items: Array<{ str?: string }> }>;
        cleanup: () => void;
      }>;
      destroy: () => Promise<void>;
    }>;
  };
};

let pdfJsPromise: Promise<PdfJsModule> | null = null;
const importPdfJs = new Function("specifier", "return import(specifier)") as (specifier: string) => Promise<PdfJsModule>;

class NodeDOMMatrix {
  a = 1;
  b = 0;
  c = 0;
  d = 1;
  e = 0;
  f = 0;

  constructor(init?: number[]) {
    if (Array.isArray(init)) {
      [this.a, this.b, this.c, this.d, this.e, this.f] = [
        Number(init[0] ?? 1),
        Number(init[1] ?? 0),
        Number(init[2] ?? 0),
        Number(init[3] ?? 1),
        Number(init[4] ?? 0),
        Number(init[5] ?? 0),
      ];
    }
  }

  multiplySelf() { return this; }
  preMultiplySelf() { return this; }
  translate() { return this; }
  scale() { return this; }
  invertSelf() { return this; }
}

class NodeImageData {
  data: Uint8ClampedArray;
  width: number;
  height: number;
  colorSpace = "srgb";

  constructor(dataOrWidth: Uint8ClampedArray | number, widthOrHeight: number, height?: number) {
    if (typeof dataOrWidth === "number") {
      this.width = dataOrWidth;
      this.height = widthOrHeight;
      this.data = new Uint8ClampedArray(this.width * this.height * 4);
    } else {
      this.data = dataOrWidth;
      this.width = widthOrHeight;
      this.height = height ?? 0;
    }
  }
}

class NodePath2D {
  addPath() {}
  arc() {}
  arcTo() {}
  ellipse() {}
  moveTo() {}
  lineTo() {}
  bezierCurveTo() {}
  quadraticCurveTo() {}
  rect() {}
  roundRect() {}
  closePath() {}
}

function installPdfJsNodeGlobals() {
  const globalScope = globalThis as any;
  globalScope.DOMMatrix ??= NodeDOMMatrix;
  globalScope.ImageData ??= NodeImageData;
  globalScope.Path2D ??= NodePath2D;
}

function getPdfJs(): Promise<PdfJsModule> {
  installPdfJsNodeGlobals();
  pdfJsPromise ??= importPdfJs("pdfjs-dist/legacy/build/pdf.mjs").then((mod) => {
    mod.GlobalWorkerOptions.workerSrc = "";
    return mod;
  });
  return pdfJsPromise;
}

async function extractPdfTextWithPdfJs(buf: Buffer): Promise<{ text: string; pageCount: number }> {
  const pdfjs = await getPdfJs();
  const task = pdfjs.getDocument({
    data: new Uint8Array(buf),
    disableWorker: true,
    useWorkerFetch: false,
    isEvalSupported: false,
    useSystemFonts: true,
  });
  const doc = await task.promise;
  try {
    const pageTexts: string[] = [];
    for (let pageNumber = 1; pageNumber <= doc.numPages; pageNumber += 1) {
      const page = await doc.getPage(pageNumber);
      const content = await page.getTextContent({ disableCombineTextItems: false });
      pageTexts.push(content.items.map((item: any) => item.str ?? "").join(" "));
      page.cleanup();
    }
    return { text: pageTexts.join("\n"), pageCount: doc.numPages };
  } finally {
    await doc.destroy();
  }
}

// ── Constants ─────────────────────────────────────────────────────────────────

const AMOUNT_RE =
  /(?<!\d)(?:\([\s]*\$?[\s]*([\d,]+(?:\.\d{1,2})?)\s*\)|-?\$?\s*([\d,]+(?:\.\d{1,2})?))\s*(?:CAD|USD)?(?!\d)/;

const ASSET_SECTION_RE =
  /\b(assets?|holdings?|investments?|real estate|cash|net worth statement|total assets?)\b/i;

const LIABILITY_SECTION_RE =
  /\b(liabilit(?:y|ies)|debts?|loans? (?:outstanding|owing|balance)|mortgages?)\b/i;

const SKIP_LINE_RE =
  /\b(total|subtotal|grand total|net worth|balance|summary|page \d|as at|as of|prepared|report date|statement date)\b/i;

const MIN_LINE_LENGTH = 5;
const MIN_AMOUNT = 1;

type SectionContext = "asset" | "liability" | "unknown";
type SectionLabel = "Real Estate" | "Investments" | "Mortgages" | "Other";

// ── Internal helpers ──────────────────────────────────────────────────────────

function tempId(): string {
  return Math.random().toString(36).slice(2, 10);
}

function cleanLine(raw: string): string {
  return raw.replace(/[\t\f\r]+/g, " ").replace(/\s{2,}/g, " ").trim();
}

function extractLabel(line: string, match: RegExpExecArray): string {
  const before = line.slice(0, match.index).trim();
  return before.replace(/[.\-_:]+$/, "").trim();
}

function matchToAmount(match: RegExpExecArray): number {
  if (match[1]) return parseAmount(match[1]);
  return parseAmount(match[2] ?? "");
}

function inferSectionLabel(line: string, fallback: SectionLabel): SectionLabel {
  if (/\breal estate\b/i.test(line)) return "Real Estate";
  if (/\binvestments?\b/i.test(line)) return "Investments";
  if (/\bmortgages?\b/i.test(line)) return "Mortgages";
  return fallback;
}

function amountFromToken(token: string): number | null {
  const cleaned = token.replace(/\$/g, "").trim();
  if (!cleaned || cleaned === "-") return null;
  const value = parseAmount(cleaned);
  return Number.isFinite(value) ? Math.abs(Math.round(value)) : null;
}

function extractMoneyTokens(text: string): number[] {
  return Array.from(text.matchAll(/(?:\(\s*\$?\s*[\d,]+(?:\.\d{1,2})?\s*\)|\$?\s*[\d,]+(?:\.\d{1,2})?|-)/g))
    .map(match => amountFromToken(match[0]))
    .filter((amount): amount is number => amount !== null);
}

function parseStatementRow(line: string, context: SectionContext, sectionLabel: SectionLabel): ParsedItem | null {
  const firstCurrency = line.indexOf("$");
  const percentMatch = line.match(/\d+(?:\.\d+)?%/);
  const labelEndIndex = [firstCurrency, percentMatch?.index ?? -1]
    .filter(index => index >= 0)
    .sort((a, b) => a - b)[0];

  if (labelEndIndex === undefined || labelEndIndex <= 0) return null;

  const label = line.slice(0, labelEndIndex).trim().replace(/[\-_:]+$/, "").trim();
  if (!label || SKIP_LINE_RE.test(label)) return null;

  const valueStartIndex = firstCurrency >= 0 ? firstCurrency : labelEndIndex;
  const values = extractMoneyTokens(line.slice(valueStartIndex));
  if (values.length === 0) return null;

  const currentValue = values.length > 1 ? values[values.length - 1] : values[0];
  const priorValue = values.length > 1 ? values[0] : currentValue;
  const fairMarketValue = values.length >= 5 ? values[1] : undefined;
  const propertyMortgage = values.length >= 5 ? values[2] : undefined;
  const netValue = values.length >= 5 ? values[3] : undefined;
  if (Math.abs(currentValue) < MIN_AMOUNT && Math.abs(priorValue) < MIN_AMOUNT) return null;

  const type: "asset" | "liability" = context === "liability" ? "liability" : "asset";
  const category = sectionLabel === "Mortgages" ? "Mortgages" : sectionLabel === "Other" ? inferCategory(label) : sectionLabel;

  return {
    tempId: tempId(),
    name: label,
    category,
    type,
    amount: currentValue,
    priorValue,
    changeAmount: currentValue - priorValue,
    percentInterest: percentMatch?.[0],
    fairMarketValue,
    propertyMortgage,
    netValue,
    notes: "",
    needsReview: true,
    reviewReason: "Extracted from PDF statement table - verify column mapping and values",
    confidenceScore: 0.78,
    sourceTextSnippet: line.slice(0, 180),
  };
}

// ── Shared text → financial items parser ──────────────────────────────────────

export interface TextParseResult {
  items: ParsedItem[];
  totalRows: number;
  skippedRows: number;
  warnings: string[];
}

/**
 * Parse a multi-line text string extracted from a PDF or OCR pass into
 * a list of ParsedItems.  Used by both the PDF text path and the OCR path.
 */
export function parseFinancialText(rawText: string): TextParseResult {
  const items: ParsedItem[] = [];
  let totalRows = 0;
  let skippedRows = 0;
  const warnings: string[] = [];
  let context: SectionContext = "unknown";
  let sectionLabel: SectionLabel = "Other";

  for (const rawLine of rawText.split(/\n/)) {
    const line = cleanLine(rawLine);
    if (line.length < MIN_LINE_LENGTH) continue;
    totalRows++;

    // Section header detection — no amount on the same line
    if (ASSET_SECTION_RE.test(line) && !AMOUNT_RE.test(line)) {
      context = /liabilit/i.test(line) ? "liability" : "asset";
      sectionLabel = inferSectionLabel(line, sectionLabel);
      skippedRows++;
      continue;
    }
    if (LIABILITY_SECTION_RE.test(line) && !AMOUNT_RE.test(line)) {
      context = "liability";
      sectionLabel = inferSectionLabel(line, sectionLabel);
      skippedRows++;
      continue;
    }

    // Skip total / summary rows
    if (SKIP_LINE_RE.test(line)) { skippedRows++; continue; }

    const statementRow = parseStatementRow(line, context, sectionLabel);
    if (statementRow) {
      items.push(statementRow);
      continue;
    }

    const match = AMOUNT_RE.exec(line);
    if (!match) { skippedRows++; continue; }

    const amount = matchToAmount(match);
    if (isNaN(amount) || Math.abs(amount) < MIN_AMOUNT) { skippedRows++; continue; }

    const label = extractLabel(line, match);
    if (!label) { skippedRows++; continue; }

    const isNegative = amount < 0;
    const type: "asset" | "liability" =
      context !== "unknown" ? context
      : isNegative           ? "liability"
      :                        classifyLabel(label);

    const category = inferCategory(
      label + " " + (context === "liability" ? "liability loan" : "")
    );

    const absAmount = Math.abs(Math.round(amount));
    const amountReview = absAmount === 0
      ? "Amount is zero — enter the correct value"
      : absAmount > 5_000_000
        ? "Unusually large amount — double-check"
        : "Extracted from PDF — verify amount and type";

    // PDF extraction is always approximate — set a moderate confidence
    const confidenceScore = absAmount === 0 ? 0.3
      : absAmount > 5_000_000               ? 0.5
      : context !== "unknown"               ? 0.75
      :                                       0.65;

    items.push({
      tempId: tempId(),
      name: label,
      category,
      type,
      amount: absAmount,
      notes: "",
      needsReview: true,
      reviewReason: amountReview,
      confidenceScore,
      sourceTextSnippet: line.slice(0, 120),
    });
  }

  if (items.length === 0) {
    warnings.push(
      "No financial line items were detected. " +
      "The format may not be supported — you can add items manually below."
    );
  } else {
    warnings.push(
      `${items.length} item${items.length === 1 ? "" : "s"} extracted. ` +
      "Please review each amount and type carefully before importing."
    );
  }

  return { items, totalRows, skippedRows, warnings };
}

// ── Raw text extraction (for AI pipeline) ─────────────────────────────────────

/**
 * Extract the raw text content of a PDF (embedded text first, OCR fallback)
 * without running the financial parser. Returns an empty string when no text
 * can be retrieved. Used by the AI extraction pipeline.
 */
export async function extractPdfText(buf: Buffer): Promise<string> {
  try {
    const result = await extractPdfTextWithPdfJs(buf);
    const text = (result.text ?? "").replace(/\s+/g, " ").trim();
    if (text.length >= 20) return text;
    // Scanned PDF — fall through to OCR
    const ocrText = await ocrScannedPdfBuffer(buf, result.pageCount ?? 1);
    return ocrText.replace(/\s+/g, " ").trim();
  } catch {
    return "";
  }
}

// ── Main export ───────────────────────────────────────────────────────────────

export interface PdfParseResult extends Omit<ParseResult, "columns" | "headers"> {
  pageCount: number;
  /** True when the PDF had no embedded text AND OCR also found nothing. */
  imageOnly: boolean;
  /** Set when items came from OCR rather than embedded text. */
  ocrUsed?: boolean;
}

export async function parsePDFBuffer(buf: Buffer): Promise<PdfParseResult> {
  const warnings: string[] = [];
  let pageCount = 1;

  // ── 1. Try embedded text extraction ─────────────────────────────────────
  let rawText = "";
  let extractionFailed = false;

  try {
    const result = await extractPdfTextWithPdfJs(buf);
    rawText = result.text ?? "";
    pageCount = result.pageCount ?? 1;
  } catch (err: any) {
    extractionFailed = true;
    warnings.push(`PDF text extraction error: ${err?.message ?? "unknown error"}`);
  }

  const strippedText = rawText.replace(/\s+/g, " ").trim();
  const hasEmbeddedText = !extractionFailed && strippedText.length >= 20;

  // ── 2. If no embedded text → try OCR ─────────────────────────────────────
  if (!hasEmbeddedText) {
    try {
      const ocrText = await ocrScannedPdfBuffer(buf, pageCount);
      const ocrStripped = ocrText.replace(/\s+/g, " ").trim();

      if (ocrStripped.length >= 20) {
        const parsed = parseFinancialText(ocrText);
        return {
          pageCount,
          imageOnly: false,
          ocrUsed: true,
          items: parsed.items,
          warnings: [
            "This PDF was scanned — text was recognized via OCR. " +
            "OCR accuracy depends on scan quality; please review all values carefully.",
            ...parsed.warnings,
          ],
          totalRows: parsed.totalRows,
          skippedRows: parsed.skippedRows,
        };
      }
    } catch (ocrErr: any) {
      warnings.push(`OCR failed: ${ocrErr?.message ?? "unknown error"}`);
    }

    // Both text extraction and OCR yielded nothing
    return {
      pageCount,
      imageOnly: true,
      items: [],
      warnings: [
        ...warnings,
        "This PDF appears to be a low-quality scan or image-only file — " +
        "neither text extraction nor OCR found readable content. " +
        "Try a CSV or XLSX export from your financial institution instead.",
      ],
      totalRows: 0,
      skippedRows: 0,
    };
  }

  // ── 3. Parse embedded text ────────────────────────────────────────────────
  const parsed = parseFinancialText(rawText);
  return {
    pageCount,
    imageOnly: false,
    items: parsed.items,
    warnings: parsed.warnings,
    totalRows: parsed.totalRows,
    skippedRows: parsed.skippedRows,
  };
}
