export class AppError extends Error {
  public readonly code: string;
  public readonly statusCode: number;

  constructor(message: string, code: string, statusCode = 500) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.statusCode = statusCode;
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string, id?: string) {
    super(id ? `${resource} with id "${id}" not found` : `${resource} not found`, "NOT_FOUND", 404);
    this.name = "NotFoundError";
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = "Unauthorized") {
    super(message, "UNAUTHORIZED", 401);
    this.name = "UnauthorizedError";
  }
}

export class ForbiddenError extends AppError {
  constructor(message = "Forbidden") {
    super(message, "FORBIDDEN", 403);
    this.name = "ForbiddenError";
  }
}

export class ValidationError extends AppError {
  public readonly issues: unknown;

  constructor(message: string, issues?: unknown) {
    super(message, "VALIDATION_ERROR", 400);
    this.name = "ValidationError";
    this.issues = issues;
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, "CONFLICT", 409);
    this.name = "ConflictError";
  }
}

export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}

/** Duck-type match for `HubApiConfigError` without importing hub-api client (pulls `server-only`). */
function isHubApiConfigError(error: unknown): error is Error {
  return error instanceof Error && error.name === "HubApiConfigError";
}

export function toApiError(error: unknown): { message: string; code: string; status: number } {
  if (isAppError(error)) {
    return { message: error.message, code: error.code, status: error.statusCode };
  }
  if (isHubApiConfigError(error)) {
    return { message: error.message, code: "HUB_API_CONFIG", status: 503 };
  }
  if (error instanceof Error && error.message.trim().length > 0) {
    return { message: error.message, code: "INTERNAL_ERROR", status: 500 };
  }
  return { message: "Internal server error", code: "INTERNAL_ERROR", status: 500 };
}
