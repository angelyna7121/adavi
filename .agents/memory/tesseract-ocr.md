---
name: Tesseract.js v7 + ImageMagick OCR pipeline
description: How to run Tesseract.js in Node.js/ESM and render scanned PDFs to PNG for OCR
---

## Tesseract.js v7 Node.js import
- Package entry: `src/index.js` (CJS). Import via `createRequire`:
  ```ts
  const _require = createRequire(import.meta.url);
  const { createWorker } = _require("tesseract.js");
  ```
- Worker API: `createWorker(lang, oem, { cachePath, logger })` → async worker with `.recognize(buf)` → `{ data: { text } }`
- `TESS_CACHE = path.join(os.tmpdir(), 'tessdata_cache')` — language data persists across restarts
- Worker boot time: ~860ms (language data cached); OCR of a dense PNG: ~950ms

**Why:** `import … from 'tesseract.js'` fails in ESM tsx because the package has no ESM export — CJS interop required.

## PDF → PNG rendering (scanned PDFs)
- Command: `magick -density 200 "file.pdf[N]" -background white -alpha remove PNG:-` (stdout PNG)
- Requires Ghostscript (Nix: `ghostscript` package). Must be installed — ImageMagick delegates PDF to GS.
- Use `magick` (v7), NOT `convert` (deprecated/broken in v7).
- MAX_PAGES = 12 to avoid runaway processing on large scans.

**Why:** Scanned PDFs have no embedded text; embedded text PDFs are handled by pdf-parse first. The pipeline tries embedded text → OCR fallback → imageOnly flag if both fail.

## How to apply
- `ocrImageBuffer(buf)` → raw OCR text for JPG/PNG uploads
- `ocrScannedPdfBuffer(pdfBuf, pageCount)` → concatenated OCR text from all pages
- Both return raw text → feed to `parseFinancialText()` from pdfParser.ts
