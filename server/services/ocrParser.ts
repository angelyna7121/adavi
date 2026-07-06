/**
 * OCR pipeline — Tesseract.js v7 for images, ImageMagick + Ghostscript for scanned PDFs.
 *
 * Entry points:
 *   ocrImageBuffer(buf)           → recognized text (for JPG / PNG uploads)
 *   ocrScannedPdfBuffer(pdfBuf)   → recognized text from all pages of a scanned PDF
 *
 * Both functions return raw text ready to be fed into parseFinancialText().
 */

import { execFile } from "child_process";
import { promisify } from "util";
import os from "os";
import path from "path";
import fs from "fs/promises";

const execFileAsync = promisify(execFile);

type CreateWorker = (
  lang: string,
  oem?: number,
  opts?: Record<string, unknown>
) => Promise<{
  recognize: (img: Buffer | string) => Promise<{ data: { text: string } }>;
  terminate: () => Promise<void>;
}>;

let createWorkerPromise: Promise<CreateWorker> | null = null;

function getCreateWorker(): Promise<CreateWorker> {
  createWorkerPromise ??= import("tesseract.js").then((mod) => mod.createWorker as unknown as CreateWorker);
  return createWorkerPromise;
}

// Language data cache directory — persisted across restarts
const TESS_CACHE = path.join(os.tmpdir(), "tessdata_cache");

// ── Constants ─────────────────────────────────────────────────────────────────
/** Max PDF pages to OCR (avoids runaway processing for large scans). */
const MAX_PAGES = 12;
/** ImageMagick render density (DPI). Higher → better OCR, slower. */
const DENSITY = 200;

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Run Tesseract.js on a single image buffer.
 * Returns the recognized text string.
 */
async function tesseractRecognize(imgBuf: Buffer): Promise<string> {
  await fs.mkdir(TESS_CACHE, { recursive: true });
  const createWorker = await getCreateWorker();
  const worker = await createWorker("eng", 1, {
    cachePath: TESS_CACHE,
    // Suppress verbose logging from the worker
    logger: () => {},
  });
  try {
    const { data } = await worker.recognize(imgBuf);
    return data.text ?? "";
  } finally {
    await worker.terminate().catch(() => {});
  }
}

/**
 * Use ImageMagick (with Ghostscript backend) to render one PDF page to a PNG buffer.
 * @param pdfPath   Path to the PDF file on disk
 * @param pageIndex 0-based page index
 */
async function renderPdfPageToPng(pdfPath: string, pageIndex: number): Promise<Buffer | null> {
  try {
    const result = await execFileAsync(
      "magick",
      [
        "-density", String(DENSITY),
        `${pdfPath}[${pageIndex}]`,
        "-background", "white",
        "-alpha", "remove",
        "PNG:-",  // stream PNG to stdout
      ],
      { encoding: "buffer", maxBuffer: 80 * 1024 * 1024 }
    );
    // execFile with encoding:'buffer' puts output in stdout
    return (result as unknown as { stdout: Buffer }).stdout;
  } catch {
    return null;
  }
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * OCR a raw image buffer (JPG or PNG).
 * Returns the extracted text.
 */
export async function ocrImageBuffer(buf: Buffer): Promise<string> {
  return tesseractRecognize(buf);
}

/**
 * OCR a scanned PDF by:
 *  1. Writing the PDF to a temp file
 *  2. Rendering each page with ImageMagick+GS to PNG
 *  3. Running Tesseract.js on each page
 *  4. Concatenating the text
 *
 * @param pdfBuf    PDF file contents as a Buffer
 * @param pageCount Number of pages to process (capped at MAX_PAGES)
 */
export async function ocrScannedPdfBuffer(
  pdfBuf: Buffer,
  pageCount: number
): Promise<string> {
  // Write PDF to a temp file so ImageMagick can reference it by path + page index
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "pdf-ocr-"));
  const pdfPath = path.join(tmpDir, "doc.pdf");
  try {
    await fs.writeFile(pdfPath, pdfBuf);

    const pagesToProcess = Math.min(pageCount, MAX_PAGES);
    const pageTexts: string[] = [];

    for (let i = 0; i < pagesToProcess; i++) {
      const pngBuf = await renderPdfPageToPng(pdfPath, i);
      if (!pngBuf || pngBuf.length < 1000) continue;  // blank/failed render
      const text = await tesseractRecognize(pngBuf);
      if (text.trim()) pageTexts.push(text.trim());
    }

    return pageTexts.join("\n\n");
  } finally {
    // Clean up temp files
    await fs.rm(tmpDir, { recursive: true, force: true }).catch(() => {});
  }
}
