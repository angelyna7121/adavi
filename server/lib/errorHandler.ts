/**
 * server/lib/errorHandler.ts
 *
 * Central Express error-handling middleware.
 *
 * Rules:
 *  - Always log the full error server-side (stack, message, context).
 *  - Never send stack traces, API key names, secret names, or raw DB errors to the client.
 *  - Always respond with { message: string, code: string }.
 *  - Operational errors (AppError subclasses) use their own safe message + status.
 *  - All other errors map to a generic 500 with a safe fallback message.
 */

import type { Request, Response, NextFunction } from "express";
import { AppError } from "./errors";
import { ZodError } from "zod";
import { appConfig } from "../config";

// ── Patterns that indicate a secret/key leak risk ─────────────────────────────

const SENSITIVE_PATTERNS = [
  /api[_\s-]?key/i,
  /secret/i,
  /password/i,
  /token/i,
  /DATABASE_URL/i,
  /STRIPE_/i,
  /OPENAI_/i,
  /GOOGLE_/i,
  /SESSION_/i,
  /sk-[a-zA-Z0-9]/,           // OpenAI key prefix
  /postgres(ql)?:\/\//i,      // DB connection string
  /Error: connect E/i,         // DB connection refused
];

function containsSensitiveInfo(str: string): boolean {
  return SENSITIVE_PATTERNS.some((pattern) => pattern.test(str));
}

// ── Safe fallback messages by status code ─────────────────────────────────────

const FALLBACK_MESSAGES: Record<number, string> = {
  400: "The request was invalid. Please check your input and try again.",
  401: "You must be signed in to do that.",
  403: "You don't have permission to do that.",
  404: "The requested resource was not found.",
  409: "This record already exists.",
  429: "Too many requests. Please slow down and try again.",
  500: "Something went wrong on our end. Please try again.",
  502: "A required service is temporarily unavailable.",
  503: "This feature is temporarily unavailable. Please try again shortly.",
};

function safeFallback(status: number): string {
  return FALLBACK_MESSAGES[status] ?? "Something went wrong. Please try again.";
}

// ── Internal logger ───────────────────────────────────────────────────────────

function logError(err: unknown, req: Request): void {
  const method  = req.method;
  const path    = req.path;
  const status  = err instanceof AppError ? err.statusCode : 500;
  const name    = err instanceof Error ? err.name : "UnknownError";
  const message = err instanceof Error ? err.message : String(err);
  const stack   = err instanceof Error ? err.stack : undefined;

  if (status >= 500) {
    console.error(`[error] ${method} ${path} → ${status} ${name}: ${message}`);
    if (stack && appConfig.isDev) console.error(stack);
  } else if (appConfig.isDev) {
    console.warn(`[warn]  ${method} ${path} → ${status} ${name}: ${message}`);
  }
}

// ── Main middleware ───────────────────────────────────────────────────────────

export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  logError(err, req);

  // ── Zod validation errors ───────────────────────────────────────────────────
  if (err instanceof ZodError) {
    const firstIssue = err.errors[0];
    const detail = firstIssue?.message ?? "Invalid value";
    res.status(400).json({
      message: detail,
      code: "VALIDATION_ERROR",
    });
    return;
  }

  // ── Operational AppError subclasses ────────────────────────────────────────
  if (err instanceof AppError) {
    const message = containsSensitiveInfo(err.message)
      ? safeFallback(err.statusCode)
      : err.message;

    res.status(err.statusCode).json({ message, code: err.code });
    return;
  }

  // ── Unknown / programmer errors ─────────────────────────────────────────────
  // Never leak raw error messages — they may contain secrets, stack paths, etc.
  if (err instanceof Error && containsSensitiveInfo(err.message)) {
    res.status(500).json({ message: safeFallback(500), code: "INTERNAL_ERROR" });
    return;
  }

  // Generic 500 — safe fallback only
  res.status(500).json({
    message: safeFallback(500),
    code: "INTERNAL_ERROR",
  });
}

// ── 404 handler (no route matched) ───────────────────────────────────────────

export function notFoundHandler(_req: Request, res: Response): void {
  res.status(404).json({
    message: "The requested page or resource could not be found.",
    code: "NOT_FOUND",
  });
}
