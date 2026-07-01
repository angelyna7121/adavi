/**
 * server/lib/errors.ts
 *
 * Typed error classes for the API layer.
 *
 * AppError is the base. Subclasses set a human-safe `message` (shown to users)
 * and an optional `code` for programmatic handling on the client.
 *
 * NEVER put stack traces, secret names, or internal details in `message`.
 */

export class AppError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number = 500,
    public readonly code: string = "INTERNAL_ERROR",
    public readonly cause?: unknown
  ) {
    super(message);
    this.name = "AppError";
  }
}

export class ValidationError extends AppError {
  constructor(message = "The submitted data is invalid. Please check your input.") {
    super(message, 400, "VALIDATION_ERROR");
    this.name = "ValidationError";
  }
}

export class NotFoundError extends AppError {
  constructor(message = "The requested resource was not found.") {
    super(message, 404, "NOT_FOUND");
    this.name = "NotFoundError";
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = "You must be signed in to do that.") {
    super(message, 401, "UNAUTHORIZED");
    this.name = "UnauthorizedError";
  }
}

export class ForbiddenError extends AppError {
  constructor(message = "You don't have permission to do that.") {
    super(message, 403, "FORBIDDEN");
    this.name = "ForbiddenError";
  }
}

export class AIServiceError extends AppError {
  constructor(message = "The AI service is temporarily unavailable. Please try again shortly.") {
    super(message, 503, "AI_SERVICE_ERROR");
    this.name = "AIServiceError";
  }
}

export class AINotConfiguredError extends AppError {
  constructor(message = "AI features are not available right now.") {
    super(message, 503, "AI_NOT_CONFIGURED");
    this.name = "AINotConfiguredError";
  }
}

export class PaymentError extends AppError {
  constructor(message = "There was a problem processing your payment. Please try again.") {
    super(message, 402, "PAYMENT_ERROR");
    this.name = "PaymentError";
  }
}

export class ConflictError extends AppError {
  constructor(message = "This record already exists.") {
    super(message, 409, "CONFLICT");
    this.name = "ConflictError";
  }
}

export class ServiceUnavailableError extends AppError {
  constructor(message = "This feature is temporarily unavailable. Please try again shortly.") {
    super(message, 503, "SERVICE_UNAVAILABLE");
    this.name = "ServiceUnavailableError";
  }
}
