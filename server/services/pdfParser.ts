/**
 * PDF text extraction + financial-item parser
 *
 * Uses pdf-parse v2 to pull embedded text from a PDF buffer.
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

import { createRequire } from "module";
import type { ParsedItem, ParseResult } from "./csvParser.js";
import { classifyLabel, inferCategoryExported as inferCategory, parseAmount } from "./csvParser.js";
import { ocrScannedPdfBuffer } from "./ocrParser.js";

// pdf-parse v2 — class-based API, CJS module.
const _require = createRequire(import.meta.url);
const { PDFParse } = _require("pdf-parse") as {
  PDFParse: new (opts: { data: Buffer | Uint8Array }) => {
    load(): Promise<void>;
    destroy(): Promise<void>;
    getText(opts?: { disableCombineTextItems?: boolean }): Promise<{
      text: string;
      total: number;
      pages: Array<{ num: number; text: string }>;
    }>;
  };
};

// ── Constants ─────────────────────────────────────────────────────────────────

const AMOUNT_RE =
  /(?<!\d)(?:\([\s]*\$?[\s]*([\d,]+(?:\.\d{1,2})?)\s*\)|-?\$?\s*([\d,]+(?:\.\d{1,2})?))\s*(?:CAD|USD)?(?!\d)/;

const ASSET_SECTION_RE =
  /\b(assets?|holdings?|investments?|net worth statement|total assets?)\b/i;

const LIABILITY_SECTION_RE =
  /\b(liabilit(?:y|ies)|debts?|loans? (?:outstanding|owing|balance)|mortgages?)\b/i;

const SKIP_LINE_RE =
  /\b(total|subtotal|grand total|net worth|balance|summary|page \d|as at|as of|prepared|report date|statement date)\b/i;

const MIN_LINE_LENGTH = 5;
const MIN_AMOUNT = 1;

type SectionContext = "asset" | "liability" | "unknown";

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

  for (const rawLine of rawText.split(/\n/)) {
    const line = cleanLine(rawLine);
    if (line.length < MIN_LINE_LENGTH) continue;
    totalRows++;

    // Section header detection — no amount on the same line
    if (ASSET_SECTION_RE.test(line) && !AMOUNT_RE.test(line)) {
      context = /liabilit/i.test(line) ? "liability" : "asset";
      skippedRows++;
      continue;
    }
    if (LIABILITY_SECTION_RE.test(line) && !AMOUNT_RE.test(line)) {
      context = "liability";
      skippedRows++;
      continue;
    }

    // Skip total / summary rows
    if (SKIP_LINE_RE.test(line)) { skippedRows++; continue; }

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
  const parser = new PDFParse({ data: buf });
  try {
    await parser.load();
    const result = await parser.getText({ disableCombineTextItems: false });
    const text = (result.text ?? "").replace(/\s+/g, " ").trim();
    if (text.length >= 20) return text;
    // Scanned PDF — fall through to OCR
    const ocrText = await ocrScannedPdfBuffer(buf, result.total ?? 1);
    return ocrText.replace(/\s+/g, " ").trim();
  } catch {
    return "";
  } finally {
    await parser.destroy().catch(() => {});
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

  const parser = new PDFParse({ data: buf });
  try {
    await parser.load();
    const result = await parser.getText({ disableCombineTextItems: false });
    rawText = result.text ?? "";
    pageCount = result.total ?? 1;
  } catch (err: any) {
    extractionFailed = true;
    warnings.push(`PDF text extraction error: ${err?.message ?? "unknown error"}`);
  } finally {
    await parser.destroy().catch(() => {});
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
