/**
 * server/services/financialDocumentExtractor.ts
 *
 * Server-side OpenAI extraction service.
 * Receives raw document text (from PDF, CSV, OCR, etc.) and returns
 * structured financial items — valid JSON only.
 *
 * Usage:
 *   import { extractFinancialDocument } from "./financialDocumentExtractor";
 *   const result = await extractFinancialDocument(rawText);
 */

import OpenAI from "openai";
import { openaiConfig } from "../config";
import { FINANCIAL_DOCUMENT_EXTRACTOR_PROMPT } from "../ai/prompts/financial-document-extractor";
import { classifyItem } from "./classificationEngine";

// ── Output schema ─────────────────────────────────────────────────────────────

export type ItemType = "asset" | "liability";

/** Exact fields returned per extracted line item. */
export interface ExtractedItem {
  itemName: string;
  category: string;
  itemType: ItemType;
  amount: number;
  confidenceScore: number;
  sourceTextSnippet: string;
  notes: string;
  needsReview: boolean;
  /** Human-readable explanation of why needsReview is true. */
  reviewReason?: string;
}

/** Top-level response from extractFinancialDocument(). */
export interface ExtractionResult {
  institution: string;
  documentType: string;
  statementDate: string;
  currency: string;
  items: ExtractedItem[];
}

/**
 * Full return value including the verbatim raw JSON string from OpenAI.
 * The rawResponse is stored as-is in ai_extractions and never modified.
 */
export interface ExtractionResponse {
  result: ExtractionResult;
  /** Verbatim JSON string returned by the model, before any parsing. */
  rawResponse: string;
  /** Model identifier used for this extraction. */
  model: string;
}

// ── Error types ───────────────────────────────────────────────────────────────

export class ExtractionError extends Error {
  constructor(message: string, public readonly cause?: unknown) {
    super(message);
    this.name = "ExtractionError";
  }
}

export class OpenAINotConfiguredError extends ExtractionError {
  constructor() {
    super("OPENAI_API_KEY is not configured. AI extraction is unavailable.");
    this.name = "OpenAINotConfiguredError";
  }
}

// ── Model configuration ───────────────────────────────────────────────────────

const MODEL       = "gpt-4o-mini";
const TEMPERATURE = 0.1;
/** Max characters of document text sent to the model (keeps cost low). */
const MAX_TEXT_CHARS = 12_000;

// ── Main extraction function ───────────────────────────────────────────────────

/**
 * Extract structured financial data from raw document text.
 *
 * Calls OpenAI server-side only — the API key never reaches the client.
 * Returns both the structured result AND the verbatim raw JSON string so the
 * caller can persist it to ai_extractions without transformation.
 *
 * @throws OpenAINotConfiguredError  – OPENAI_API_KEY is missing
 * @throws ExtractionError           – API call failed or response was invalid
 */
export async function extractFinancialDocument(
  rawText: string
): Promise<ExtractionResponse> {
  if (!openaiConfig.configured || !openaiConfig.apiKey) {
    throw new OpenAINotConfiguredError();
  }

  if (!rawText || rawText.trim().length === 0) {
    const empty = emptyResult();
    return { result: empty, rawResponse: JSON.stringify(empty), model: MODEL };
  }

  const client = new OpenAI({ apiKey: openaiConfig.apiKey });
  const truncated = rawText.slice(0, MAX_TEXT_CHARS);

  let rawResponse: string;
  try {
    const response = await client.responses.create({
      model: MODEL,
      temperature: TEMPERATURE,
      instructions: FINANCIAL_DOCUMENT_EXTRACTOR_PROMPT,
      input: `Extract financial data from the following document text:\n\n${truncated}`,
      text: {
        format: { type: "json_object" },
      },
    });
    rawResponse = response.output_text ?? "";
  } catch (err: any) {
    throw new ExtractionError(
      `OpenAI API call failed: ${err?.message ?? "unknown error"}`,
      err
    );
  }

  const result = parseAndValidate(rawResponse);
  return { result, rawResponse, model: MODEL };
}

// ── Response parsing & validation ─────────────────────────────────────────────

function parseAndValidate(raw: string): ExtractionResult {
  let parsed: any;
  try {
    parsed = JSON.parse(raw.trim());
  } catch {
    throw new ExtractionError(
      "AI returned invalid JSON. Raw response: " + raw.slice(0, 300)
    );
  }

  const result: ExtractionResult = {
    institution:   str(parsed.institution),
    documentType:  str(parsed.documentType),
    statementDate: str(parsed.statementDate),
    currency:      str(parsed.currency) || "CAD",
    items: [],
  };

  if (Array.isArray(parsed.items)) {
    result.items = parsed.items
      .filter((item: any) => item && typeof item === "object")
      .map((item: any): ExtractedItem => {
        const confidenceScore = typeof item.confidenceScore === "number"
          ? clamp01(item.confidenceScore)
          : 0.5;

        const amount = typeof item.amount === "number"
          ? Math.abs(Math.round(item.amount * 100) / 100)
          : 0;

        // Let the classification engine enforce consistent asset/liability rules.
        // The AI's suggestion is passed as a hint but can be overridden.
        const aiSuggestedType: ItemType =
          item.itemType === "liability" ? "liability" : "asset";
        const { type: itemType, category: enforcedCategory, typeConflict } = classifyItem(
          str(item.itemName) || "Unknown",
          str(item.category),
          aiSuggestedType,
        );

        // Build review reason — most specific first
        let reviewReason: string | undefined;
        if (amount === 0) {
          reviewReason = "Amount could not be determined — enter the correct value";
        } else if (confidenceScore < 0.5) {
          reviewReason = "Low AI confidence — verify name, type, and amount";
        } else if (typeConflict) {
          reviewReason = `Type changed from ${aiSuggestedType} to ${itemType} — verify`;
        } else if (confidenceScore < 0.8) {
          reviewReason = "AI confidence below threshold — review before importing";
        } else if (item.needsReview === true) {
          reviewReason = "Flagged by extraction model — review before importing";
        }

        const needsReview = !!(reviewReason || confidenceScore < 0.8 || item.needsReview === true || typeConflict);

        return {
          itemName:          str(item.itemName)          || "Unknown",
          category:          enforcedCategory,
          itemType,
          amount,
          confidenceScore,
          sourceTextSnippet: str(item.sourceTextSnippet).slice(0, 120),
          notes:             str(item.notes),
          needsReview,
          reviewReason,
        };
      })
      // Drop zero-amount items that don't even need review
      .filter((item: ExtractedItem) => item.amount > 0 || item.needsReview);
  }

  return result;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function str(v: unknown): string {
  return typeof v === "string" ? v : "";
}

function clamp01(n: number): number {
  return Math.min(1, Math.max(0, n));
}

function emptyResult(): ExtractionResult {
  return {
    institution:   "",
    documentType:  "",
    statementDate: "",
    currency:      "CAD",
    items:         [],
  };
}
