/**
 * Secure document upload API
 *
 * POST   /api/documents           — upload 1–10 files (multipart/form-data, field: "files")
 * GET    /api/documents           — list caller's uploaded documents
 * GET    /api/documents/:id       — get single document metadata (owner-only)
 * GET    /api/documents/:id/download — stream the file to the authenticated owner
 * DELETE /api/documents/:id       — delete document + file from disk (owner-only)
 */

import type { Express, Request, Response, NextFunction } from "express";
import multer from "multer";
import path from "path";
import fs from "fs/promises";
import { createReadStream } from "fs";
import crypto from "crypto";
import { z } from "zod";
import { storage } from "../services/storage";
import { parseCSVBuffer, parseXLSXBuffer } from "../services/csvParser";
import { parsePDFBuffer, extractPdfText } from "../services/pdfParser";
import { ocrImageBuffer } from "../services/ocrParser";
import { parseFinancialText } from "../services/pdfParser";
import { extractFinancialDocument, OpenAINotConfiguredError } from "../services/financialDocumentExtractor";
import { classifyItem } from "../services/classificationEngine";
import * as XLSX from "xlsx";

// ── Constants ─────────────────────────────────────────────────────────────────

const MAX_FILE_SIZE_BYTES = 4 * 1024 * 1024; // Keep multipart requests below Vercel's serverless body limit.
const MAX_FILES_PER_REQUEST = 10;
const UPLOAD_ROOT = path.resolve("uploads");

/** Allowed types: MIME → canonical extension */
const ALLOWED_MIMES: Record<string, string> = {
  "application/pdf":                                                           "pdf",
  "image/jpeg":                                                                "jpg",
  "image/png":                                                                 "png",
  "text/csv":                                                                  "csv",
  "application/csv":                                                           "csv",
  "text/plain":                                                                "csv",  // some agents send CSV as text/plain
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet":        "xlsx",
  "application/vnd.ms-excel":                                                  "xlsx",
};

/** Magic byte signatures for server-side content validation */
const MAGIC_BYTES: Record<string, number[]> = {
  pdf:  [0x25, 0x50, 0x44, 0x46],        // %PDF
  jpg:  [0xFF, 0xD8, 0xFF],
  png:  [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A],
  xlsx: [0x50, 0x4B, 0x03, 0x04],        // PK (ZIP) header
  // csv: plain text — no reliable magic bytes; validated by MIME + extension only
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (req.isAuthenticated()) return next();
  res.status(401).json({ message: "Unauthorized" });
}

function isPaid(user: any): boolean {
  return user?.subscriptionStatus === "active" && (user?.planType === "monthly" || user?.planType === "annual");
}

/** Check that the first bytes of a buffer match the expected signature. */
function verifyMagicBytes(buf: Buffer, ext: string): boolean {
  const magic = MAGIC_BYTES[ext];
  if (!magic) return true; // no signature for this type (e.g. csv) — trust MIME
  if (buf.length < magic.length) return false;
  return magic.every((byte, i) => buf[i] === byte);
}

/** Derive canonical extension from MIME type, falling back to the filename. */
function resolveExtension(mimetype: string, originalname: string): string | null {
  const byMime = ALLOWED_MIMES[mimetype.toLowerCase()];
  if (byMime) return byMime;
  const byExt = path.extname(originalname).toLowerCase().replace(".", "") as string;
  if (Object.values(ALLOWED_MIMES).includes(byExt)) return byExt;
  return null;
}

/** Ensure a per-user upload directory exists and return its path. */
async function ensureUserDir(userId: number): Promise<string> {
  const dir = path.join(UPLOAD_ROOT, String(userId));
  await fs.mkdir(dir, { recursive: true });
  return dir;
}

/** Human-readable MIME list for error messages. */
const ALLOWED_MIME_LIST = [...new Set(Object.values(ALLOWED_MIMES))].join(", ").toUpperCase();

async function parseImageBuffer(buf: Buffer, ext: "jpg" | "png"): Promise<{
  result: Record<string, unknown>;
  documentText: string;
}> {
  const sourceLabel = ext.toUpperCase();
  try {
    const ocrText = await ocrImageBuffer(buf);
    const parsed = parseFinancialText(ocrText);
    return {
      documentText: ocrText,
      result: {
        imageOnly: false,
        ocrUsed: true,
        items: parsed.items,
        totalRows: parsed.totalRows,
        skippedRows: parsed.skippedRows,
        warnings: [
          `Text recognized from ${sourceLabel} image via OCR. Review values before saving.`,
          ...parsed.warnings,
        ],
      } as unknown as Record<string, unknown>,
    };
  } catch (err: any) {
    return {
      documentText: "",
      result: {
        imageOnly: true,
        ocrUsed: false,
        items: [],
        totalRows: 0,
        skippedRows: 0,
        warnings: [
          `${sourceLabel} OCR failed: ${err?.message ?? "unknown error"}`,
          "Try a clearer image, or upload a CSV/XLSX export from your financial institution.",
        ],
      } as unknown as Record<string, unknown>,
    };
  }
}

async function parseFinancialFile(file: Express.Multer.File, ext: string): Promise<{
  result: Record<string, unknown>;
  documentText: string;
}> {
  let result: Record<string, unknown>;
  let documentText = "";

  if (ext === "xlsx") {
    result = parseXLSXBuffer(file.buffer) as unknown as Record<string, unknown>;
    try {
      const wb = XLSX.read(file.buffer, { type: "buffer" });
      documentText = wb.SheetNames.map(name => XLSX.utils.sheet_to_csv(wb.Sheets[name])).join("\n");
    } catch { /* best effort */ }
  } else if (ext === "pdf") {
    result = await parsePDFBuffer(file.buffer) as unknown as Record<string, unknown>;
    documentText = await extractPdfText(file.buffer);
  } else if (ext === "jpg" || ext === "png") {
    return parseImageBuffer(file.buffer, ext);
  } else {
    result = parseCSVBuffer(file.buffer) as unknown as Record<string, unknown>;
    documentText = file.buffer.toString("utf-8");
  }

  return { result, documentText };
}

function toStatementItems(result: Record<string, unknown>, originalName: string, documentId: number | null) {
  const rawItems = Array.isArray(result.items) ? result.items as any[] : [];
  const currentMonth = new Date().toISOString().slice(0, 7);
  return rawItems.map((item) => {
    const rawConfidence = typeof item.confidenceScore === "number" ? item.confidenceScore : item.needsReview ? 0.6 : 0.9;
    const confidence = Math.round(rawConfidence <= 1 ? rawConfidence * 100 : rawConfidence);
    const currentValue = Math.max(0, Math.round(Number(item.amount ?? item.currentValue ?? 0)));
    const priorValue = Math.max(0, Math.round(Number(item.priorValue ?? 0)));
    return {
      tempId: item.tempId ?? crypto.randomUUID(),
      documentId,
      sourceType: "parsed",
      investorName: item.investorName ?? "Primary Investor",
      familyName: item.familyName ?? "",
      institutionName: item.institutionName ?? item.accountName ?? originalName.replace(/\.[^.]+$/, ""),
      type: item.type === "liability" ? "liability" : "asset",
      category: item.category ?? "Other",
      subcategory: item.subcategory ?? "",
      name: item.name ?? item.description ?? "Review item",
      amount: currentValue,
      priorValue,
      changeAmount: Math.round(Number(item.changeAmount ?? (currentValue - priorValue))),
      percentInterest: item.percentInterest ?? "",
      fairMarketValue: Math.max(0, Math.round(Number(item.fairMarketValue ?? 0))),
      propertyMortgage: Math.max(0, Math.round(Number(item.propertyMortgage ?? 0))),
      netValue: Math.max(0, Math.round(Number(item.netValue ?? 0))),
      reportingPeriod: item.reportingPeriod ?? item.reportingDate ?? currentMonth,
      confidenceScore: Math.min(100, Math.max(0, confidence)),
      verified: false,
      sourceTextSnippet: item.sourceTextSnippet ?? "",
      notes: item.notes ?? item.reviewReason ?? "",
      needsReview: !!item.needsReview || confidence < 70,
      source: originalName,
    };
  });
}

// ── Multer configuration ──────────────────────────────────────────────────────

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_FILE_SIZE_BYTES,
    files: MAX_FILES_PER_REQUEST,
  },
  fileFilter(_req, file, cb) {
    const ext = resolveExtension(file.mimetype, file.originalname);
    if (!ext) {
      return cb(new Error(
        `"${path.extname(file.originalname) || file.mimetype}" is not supported. Accepted: ${ALLOWED_MIME_LIST}`
      ));
    }
    cb(null, true);
  },
});

// ── Route registration ────────────────────────────────────────────────────────

export function registerDocumentRoutes(app: Express) {

  app.post(
    "/api/net-worth/parse",
    requireAuth,
    (req: Request, res: Response, next: NextFunction) => {
      upload.array("files", MAX_FILES_PER_REQUEST)(req, res, (err) => {
        if (err instanceof multer.MulterError) {
          if (err.code === "LIMIT_FILE_SIZE") {
            return res.status(413).json({ message: `File too large — maximum size is ${MAX_FILE_SIZE_BYTES / 1024 / 1024} MB per file.` });
          }
          if (err.code === "LIMIT_FILE_COUNT") {
            return res.status(400).json({ message: `Too many files — maximum ${MAX_FILES_PER_REQUEST} files per request.` });
          }
          return res.status(400).json({ message: "This file type is not supported." });
        }
        if (err) return res.status(400).json({ message: "The file could not be parsed. Please try again." });
        next();
      });
    },
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const user = req.user as any;
        const files = req.files as Express.Multer.File[];
        const clientOcrText = typeof req.body?.ocrText === "string" ? req.body.ocrText : "";
        const clientOcrName = typeof req.body?.originalName === "string" ? req.body.originalName : "image upload";
        if ((!files || files.length === 0) && clientOcrText.trim()) {
          const result = parseFinancialText(clientOcrText) as unknown as Record<string, unknown>;
          const mapped = toStatementItems(result, clientOcrName, null);
          return res.json({
            documents: [{
              documentId: null,
              originalName: clientOcrName,
              status: mapped.length ? "ready" : "needs-review",
              warnings: [
                "Text was recognized from the image in your browser. Review values before saving.",
                ...((result.warnings as string[] | undefined) ?? []),
              ],
              totalRows: result.totalRows ?? 0,
              skippedRows: result.skippedRows ?? 0,
              saved: false,
            }],
            items: mapped,
            savedPermanently: false,
          });
        }

        if (!files || files.length === 0) {
          return res.status(400).json({ message: "No files received. Send files in the 'files' field." });
        }

        const paid = isPaid(user);
        const userDir = paid ? await ensureUserDir(user.id) : null;
        const documents: any[] = [];
        const items: any[] = [];

        for (const file of files) {
          const ext = resolveExtension(file.mimetype, file.originalname);
          if (!ext || !verifyMagicBytes(file.buffer, ext)) {
            documents.push({ originalName: file.originalname, status: "error", error: "File content does not match its declared type." });
            continue;
          }

          let documentId: number | null = null;
          let storedPath: string | null = null;

          if (paid && userDir) {
            const storedFilename = `${crypto.randomUUID()}.${ext}`;
            storedPath = path.join(userDir, storedFilename);
            await fs.writeFile(storedPath, file.buffer);
            const doc = await storage.createUploadedDocument({
              userId: user.id,
              originalName: file.originalname,
              storedPath,
              fileType: ext,
              fileSize: file.size,
              status: "processing",
              documentType: "net_worth_statement",
              extractedText: null,
            });
            documentId = doc.id;
          }

          try {
            const { result, documentText } = await parseFinancialFile(file, ext);
            const mapped = toStatementItems(result, file.originalname, documentId);
            items.push(...mapped);

            if (paid && documentId) {
              await storage.updateUploadedDocumentStatus(documentId, "done");
              if (documentText.trim().length > 0) {
                extractFinancialDocument(documentText)
                  .then(({ rawResponse, result: aiResult, model }) => storage.createAiExtraction({
                    documentId: documentId!,
                    userId: user.id,
                    model,
                    rawResponse,
                    itemCount: aiResult.items.length,
                  }))
                  .catch((err) => {
                    if (!(err instanceof OpenAINotConfiguredError)) {
                      console.warn(`[ai-extract] doc ${documentId}:`, (err as Error).message);
                    }
                  });
              }
            }

            documents.push({
              documentId,
              originalName: file.originalname,
              status: mapped.length ? "ready" : "needs-review",
              warnings: result.warnings ?? [],
              totalRows: result.totalRows ?? 0,
              skippedRows: result.skippedRows ?? 0,
              saved: paid,
            });
          } catch (err: any) {
            if (storedPath) await fs.unlink(storedPath).catch(() => null);
            documents.push({ documentId, originalName: file.originalname, status: "error", error: err?.message ?? "Parsing failed." });
          }
        }

        res.json({ documents, items, savedPermanently: paid });
      } catch (err) { next(err); }
    },
  );

  // ── POST /api/documents — upload files ─────────────────────────────────────
  app.post(
    "/api/documents",
    requireAuth,
    (req: Request, res: Response, next: NextFunction) => {
      upload.array("files", MAX_FILES_PER_REQUEST)(req, res, (err) => {
        if (err instanceof multer.MulterError) {
          if (err.code === "LIMIT_FILE_SIZE") {
            return res.status(413).json({
              message: `File too large — maximum size is ${MAX_FILE_SIZE_BYTES / 1024 / 1024} MB per file.`,
            });
          }
          if (err.code === "LIMIT_FILE_COUNT") {
            return res.status(400).json({
              message: `Too many files — maximum ${MAX_FILES_PER_REQUEST} files per request.`,
            });
          }
          return res.status(400).json({ message: "This file type is not supported." });
        }
        if (err) return res.status(400).json({ message: "The file could not be uploaded. Please try again." });
        next();
      });
    },
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const user = req.user as any;
        if (!isPaid(user)) {
          return res.status(403).json({
            message: "Premium subscription required to save uploaded documents permanently. Net Worth uploads remain available for temporary session parsing.",
          });
        }
        const files = req.files as Express.Multer.File[];

        if (!files || files.length === 0) {
          return res.status(400).json({ message: "No files received. Send files in the 'files' field." });
        }

        const userDir = await ensureUserDir(user.id);
        const results: Array<{ id: number; originalName: string; status: "ok" | "error"; error?: string }> = [];

        for (const file of files) {
          const ext = resolveExtension(file.mimetype, file.originalname)!;

          // ── Magic-byte validation (server-side content check) ──
          if (!verifyMagicBytes(file.buffer, ext)) {
            results.push({
              id: -1,
              originalName: file.originalname,
              status: "error",
              error: `File content does not match its declared type (${ext.toUpperCase()}).`,
            });
            continue;
          }

          // ── Persist to disk with a random UUID filename ──
          const storedFilename = `${crypto.randomUUID()}.${ext}`;
          const storedPath = path.join(userDir, storedFilename);
          await fs.writeFile(storedPath, file.buffer);

          // ── Insert metadata row ──
          const doc = await storage.createUploadedDocument({
            userId: user.id,
            originalName: file.originalname,
            storedPath,
            fileType: ext,
            fileSize: file.size,
            status: "uploaded",
            documentType: null,
            extractedText: null,
          });

          results.push({ id: doc.id, originalName: doc.originalName, status: "ok" });
        }

        const allOk = results.every(r => r.status === "ok");
        res.status(allOk ? 201 : 207).json({ results });
      } catch (err) {
        next(err);
      }
    },
  );

  // ── GET /api/documents — list caller's documents ───────────────────────────
  app.get("/api/documents", requireAuth, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = req.user as any;
      const docs = await storage.getUploadedDocuments(user.id);
      // Never expose storedPath to the client
      res.json(docs.map(({ storedPath: _sp, ...safe }) => safe));
    } catch (err) { next(err); }
  });

  // ── GET /api/documents/:id — metadata (owner-only) ─────────────────────────
  app.get("/api/documents/:id", requireAuth, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = req.user as any;
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid document ID." });

      const doc = await storage.getUploadedDocument(id, user.id);
      if (!doc) return res.status(404).json({ message: "Document not found." });

      const { storedPath: _sp, ...safe } = doc;
      res.json(safe);
    } catch (err) { next(err); }
  });

  // ── GET /api/documents/:id/download — stream file (owner-only) ────────────
  app.get("/api/documents/:id/download", requireAuth, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = req.user as any;
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid document ID." });

      const doc = await storage.getUploadedDocument(id, user.id);
      if (!doc) return res.status(404).json({ message: "Document not found." });
      if (!doc.storedPath) return res.status(404).json({ message: "File not found on server." });

      // Verify the resolved path is still inside UPLOAD_ROOT (path traversal guard)
      const resolved = path.resolve(doc.storedPath);
      if (!resolved.startsWith(UPLOAD_ROOT + path.sep)) {
        return res.status(403).json({ message: "Access denied." });
      }

      // Verify the file still exists on disk
      try { await fs.access(resolved); } catch {
        return res.status(404).json({ message: "File not found on server." });
      }

      const MIME_MAP: Record<string, string> = {
        pdf:  "application/pdf",
        jpg:  "image/jpeg",
        png:  "image/png",
        csv:  "text/csv; charset=utf-8",
        xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      };

      const contentType = MIME_MAP[doc.fileType] ?? "application/octet-stream";
      const safeFilename = encodeURIComponent(doc.originalName);

      res.setHeader("Content-Type", contentType);
      res.setHeader("Content-Disposition", `attachment; filename="${safeFilename}"`);
      res.setHeader("X-Content-Type-Options", "nosniff");
      res.setHeader("Cache-Control", "private, no-cache");

      createReadStream(resolved).pipe(res);
    } catch (err) { next(err); }
  });

  // ── GET /api/documents/:id/parse — parse CSV → reviewable items ───────────
  app.get("/api/documents/:id/parse", requireAuth, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = req.user as any;
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid document ID." });

      const doc = await storage.getUploadedDocument(id, user.id);
      if (!doc) return res.status(404).json({ message: "Document not found." });

      const PARSEABLE = ["csv", "xlsx", "pdf", "jpg", "png"];
      if (!PARSEABLE.includes(doc.fileType ?? "")) {
        return res.status(400).json({ message: "Only CSV, XLSX, PDF, JPG, and PNG files can be parsed." });
      }

      if (!doc.storedPath) return res.status(404).json({ message: "File not found on server." });

      const resolved = path.resolve(doc.storedPath);
      if (!resolved.startsWith(UPLOAD_ROOT + path.sep)) {
        return res.status(403).json({ message: "Access denied." });
      }

      try { await fs.access(resolved); } catch {
        return res.status(404).json({ message: "File not found on server." });
      }

      const buf = await fs.readFile(resolved);

      // ── Step 1: Regex parse → review items ──────────────────────────────────
      let result: Record<string, unknown>;
      let documentText = "";          // captured for AI extraction

      if (doc.fileType === "xlsx") {
        result = parseXLSXBuffer(buf) as unknown as Record<string, unknown>;
        // Build a readable text representation for the AI
        try {
          const wb = XLSX.read(buf, { type: "buffer" });
          documentText = wb.SheetNames
            .map(name => XLSX.utils.sheet_to_csv(wb.Sheets[name]))
            .join("\n");
        } catch { /* non-fatal */ }

      } else if (doc.fileType === "pdf") {
        result = await parsePDFBuffer(buf) as unknown as Record<string, unknown>;
        documentText = await extractPdfText(buf);

      } else if (doc.fileType === "jpg" || doc.fileType === "png") {
        const parsedImage = await parseImageBuffer(buf, doc.fileType as "jpg" | "png");
        result = parsedImage.result;
        documentText = parsedImage.documentText;

      } else {
        result = parseCSVBuffer(buf) as unknown as Record<string, unknown>;
        documentText = buf.toString("utf-8");
      }

      // ── Step 2: AI extraction — store raw response, never overwrite later ───
      // Runs best-effort: failures are logged but never surface to the user.
      if (documentText.trim().length > 0) {
        extractFinancialDocument(documentText)
          .then(({ rawResponse, result: aiResult, model }) => {
            return storage.createAiExtraction({
              documentId: id,
              userId: user.id,
              model,
              rawResponse,
              itemCount: aiResult.items.length,
            });
          })
          .catch((err) => {
            if (!(err instanceof OpenAINotConfiguredError)) {
              console.warn(`[ai-extract] doc ${id}:`, (err as Error).message);
            }
          });
      }

      // ── Step 3: Mark document as processing ─────────────────────────────────
      await storage.updateUploadedDocumentStatus(id, "processing");

      res.json({ ...result, documentId: id, originalName: doc.originalName });
    } catch (err) { next(err); }
  });

  // ── POST /api/documents/:id/import — commit reviewed items → NetWorthItems ─
  const importBodySchema = z.object({
    items: z.array(z.object({
      name:     z.string().min(1),
      category: z.string().default("Other"),
      type:     z.enum(["asset", "liability"]),
      amount:   z.number().int().min(0),
      notes:    z.string().optional().default(""),
    })).min(1),
  });

  app.post("/api/documents/:id/import", requireAuth, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = req.user as any;
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid document ID." });

      const doc = await storage.getUploadedDocument(id, user.id);
      if (!doc) return res.status(404).json({ message: "Document not found." });

      const parsed = importBodySchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid items payload.", errors: parsed.error.flatten() });
      }

      const { items } = parsed.data;

      // Get or create the user's net worth statement
      const statement = await storage.getOrCreateNetWorthStatement(user.id);

      // Insert all items — classification engine enforces type/category rules
      const created = await Promise.all(items.map(item => {
        const { type: enforcedType, category: enforcedCategory } = classifyItem(
          item.name,
          item.category,
          item.type,
        );
        return storage.addNetWorthItem({
          statementId: statement.id,
          userId: user.id,
          type:     enforcedType,
          category: enforcedCategory,
          name:     item.name,
          amount:   item.amount,
          notes:    item.notes || null,
        });
      }));

      // Recalculate totals from all items for this statement
      const allItems = await storage.getNetWorthItems(statement.id);
      const totalAssets = allItems.filter(i => i.type === "asset").reduce((s, i) => s + i.amount, 0);
      const totalLiabilities = allItems.filter(i => i.type === "liability").reduce((s, i) => s + i.amount, 0);
      const updated = await storage.updateNetWorthTotals(statement.id, totalAssets, totalLiabilities);

      // Mark document as done
      await storage.updateUploadedDocumentStatus(id, "done");

      res.json({
        statement: updated,
        importedCount: created.length,
        totalAssets,
        totalLiabilities,
        netWorth: totalAssets - totalLiabilities,
      });
    } catch (err) { next(err); }
  });

  // ── DELETE /api/documents/:id — delete (owner-only) ───────────────────────
  app.delete("/api/documents/:id", requireAuth, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = req.user as any;
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid document ID." });

      const doc = await storage.getUploadedDocument(id, user.id);
      if (!doc) return res.status(404).json({ message: "Document not found." });

      // Delete from DB first
      await storage.deleteUploadedDocument(id, user.id);

      // Then remove from disk (best-effort — don't fail if file is already gone)
      if (doc.storedPath) {
        const resolved = path.resolve(doc.storedPath);
        if (resolved.startsWith(UPLOAD_ROOT + path.sep)) {
          await fs.unlink(resolved).catch(() => null);
        }
      }

      res.json({ ok: true });
    } catch (err) { next(err); }
  });
}
