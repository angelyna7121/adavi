/**
 * client/src/lib/apiError.ts
 *
 * Utilities for parsing API error responses and producing user-friendly messages.
 *
 * Rules:
 *  - Only display text that came from the server's { message } field, or a safe fallback.
 *  - Never display raw Error.message values from fetch/network exceptions.
 *  - Never display status codes or HTTP jargon to users.
 */

// ── Friendly fallback messages ────────────────────────────────────────────────

const FALLBACK_MESSAGES: Record<number, string> = {
  400: "Something doesn't look right. Please check your input and try again.",
  401: "Please sign in to continue.",
  403: "You don't have permission to do that.",
  404: "That page or item couldn't be found.",
  409: "This already exists. Try a different value.",
  429: "You're doing that too quickly. Please wait a moment and try again.",
  500: "Something went wrong on our end. Please try again in a moment.",
  502: "A service is temporarily unavailable. Please try again shortly.",
  503: "This feature is temporarily unavailable. Please try again shortly.",
};

const GENERIC_FALLBACK = "Something went wrong. Please try again.";

// ── ApiError class ────────────────────────────────────────────────────────────

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code?: string
  ) {
    super(message);
    this.name = "ApiError";
  }
}

// ── Parse a failed Response into a user-friendly ApiError ────────────────────

export async function parseApiError(res: Response): Promise<ApiError> {
  let serverMessage: string | undefined;
  let code: string | undefined;

  try {
    const body = await res.json();
    if (typeof body?.message === "string" && body.message.trim().length > 0) {
      serverMessage = body.message.trim();
    }
    if (typeof body?.code === "string") {
      code = body.code;
    }
  } catch {
    // Response body was not JSON — ignore, use fallback
  }

  const message =
    serverMessage ??
    FALLBACK_MESSAGES[res.status] ??
    GENERIC_FALLBACK;

  return new ApiError(message, res.status, code);
}

// ── Extract a display string from any thrown value ────────────────────────────
//
// Use this in catch blocks to get a string safe to show in the UI.
// Falls back to the generic message for anything that looks like a raw error.

const UNSAFE_PATTERNS = [
  /api[_\s-]?key/i,
  /secret/i,
  /password/i,
  /stack\s+trace/i,
  /at\s+\w+\s+\(/,           // stack frame lines
  /postgres(ql)?:\/\//i,
  /ECONNREFUSED/i,
  /ENOTFOUND/i,
  /sk-[a-zA-Z0-9]/,
];

function looksUnsafe(str: string): boolean {
  return UNSAFE_PATTERNS.some((p) => p.test(str));
}

export function getDisplayMessage(err: unknown): string {
  if (err instanceof ApiError) {
    return looksUnsafe(err.message) ? GENERIC_FALLBACK : err.message;
  }

  if (err instanceof Error) {
    // Only show Error.message if it came from the server (ApiError) or is clearly safe
    if (looksUnsafe(err.message)) return GENERIC_FALLBACK;
    // Suppress raw fetch/network errors ("Failed to fetch", "NetworkError", etc.)
    if (/fetch|network|load|CORS/i.test(err.message)) {
      return "Unable to connect. Please check your connection and try again.";
    }
    return err.message;
  }

  return GENERIC_FALLBACK;
}

// ── Convenience: is this a specific error code? ────────────────────────────────

export function isErrorCode(err: unknown, code: string): boolean {
  return err instanceof ApiError && err.code === code;
}

export function isUnauthorized(err: unknown): boolean {
  return err instanceof ApiError && err.status === 401;
}

export function isForbidden(err: unknown): boolean {
  return err instanceof ApiError && err.status === 403;
}
