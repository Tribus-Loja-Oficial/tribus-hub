import { describe, expect, it } from "vitest";
import {
  AppError,
  ConflictError,
  ForbiddenError,
  NotFoundError,
  UnauthorizedError,
  ValidationError,
  isAppError,
  toApiError,
} from "@/lib/errors";

describe("AppError", () => {
  it("sets message, code and default statusCode", () => {
    const err = new AppError("something broke", "GENERIC");
    expect(err.message).toBe("something broke");
    expect(err.code).toBe("GENERIC");
    expect(err.statusCode).toBe(500);
    expect(err.name).toBe("AppError");
  });

  it("accepts custom statusCode", () => {
    const err = new AppError("bad", "BAD", 418);
    expect(err.statusCode).toBe(418);
  });

  it("is an instance of Error", () => {
    expect(new AppError("x", "X")).toBeInstanceOf(Error);
  });
});

describe("NotFoundError", () => {
  it("builds message with resource only", () => {
    const err = new NotFoundError("User");
    expect(err.message).toBe("User not found");
    expect(err.statusCode).toBe(404);
    expect(err.code).toBe("NOT_FOUND");
    expect(err.name).toBe("NotFoundError");
  });

  it("builds message with resource and id", () => {
    const err = new NotFoundError("Task", "abc-123");
    expect(err.message).toBe('Task with id "abc-123" not found');
  });
});

describe("UnauthorizedError", () => {
  it("uses default message", () => {
    const err = new UnauthorizedError();
    expect(err.message).toBe("Unauthorized");
    expect(err.statusCode).toBe(401);
    expect(err.code).toBe("UNAUTHORIZED");
  });

  it("accepts custom message", () => {
    const err = new UnauthorizedError("Token expired");
    expect(err.message).toBe("Token expired");
  });
});

describe("ForbiddenError", () => {
  it("uses default message", () => {
    const err = new ForbiddenError();
    expect(err.message).toBe("Forbidden");
    expect(err.statusCode).toBe(403);
    expect(err.code).toBe("FORBIDDEN");
  });

  it("accepts custom message", () => {
    const err = new ForbiddenError("No access to this resource");
    expect(err.message).toBe("No access to this resource");
  });
});

describe("ValidationError", () => {
  it("sets 400 status and stores issues", () => {
    const issues = [{ field: "title", message: "Required" }];
    const err = new ValidationError("Invalid input", issues);
    expect(err.statusCode).toBe(400);
    expect(err.code).toBe("VALIDATION_ERROR");
    expect(err.issues).toEqual(issues);
  });

  it("works without issues", () => {
    const err = new ValidationError("Bad input");
    expect(err.issues).toBeUndefined();
  });
});

describe("ConflictError", () => {
  it("sets 409 status", () => {
    const err = new ConflictError("Already exists");
    expect(err.statusCode).toBe(409);
    expect(err.code).toBe("CONFLICT");
    expect(err.message).toBe("Already exists");
  });
});

describe("isAppError", () => {
  it("returns true for AppError instances", () => {
    expect(isAppError(new AppError("x", "X"))).toBe(true);
    expect(isAppError(new NotFoundError("Resource"))).toBe(true);
    expect(isAppError(new ValidationError("bad"))).toBe(true);
  });

  it("returns false for plain errors and other values", () => {
    expect(isAppError(new Error("plain"))).toBe(false);
    expect(isAppError("string")).toBe(false);
    expect(isAppError(null)).toBe(false);
    expect(isAppError(undefined)).toBe(false);
    expect(isAppError(42)).toBe(false);
  });
});

describe("toApiError", () => {
  it("maps AppError to api shape", () => {
    const err = new NotFoundError("Project", "p-1");
    expect(toApiError(err)).toEqual({
      message: 'Project with id "p-1" not found',
      code: "NOT_FOUND",
      status: 404,
    });
  });

  it("maps unknown errors to 500 INTERNAL_ERROR", () => {
    expect(toApiError(new Error("boom"))).toEqual({
      message: "Internal server error",
      code: "INTERNAL_ERROR",
      status: 500,
    });
    expect(toApiError("string error")).toEqual({
      message: "Internal server error",
      code: "INTERNAL_ERROR",
      status: 500,
    });
    expect(toApiError(null)).toEqual({
      message: "Internal server error",
      code: "INTERNAL_ERROR",
      status: 500,
    });
  });
});
