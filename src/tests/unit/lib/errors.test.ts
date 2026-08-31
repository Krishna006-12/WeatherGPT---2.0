import { describe, it, expect } from "vitest";
import { AppError, toErrorResponse } from "@/lib/errors";

describe("errors", () => {
  it("creates AppError with correct status codes", () => {
    const err400 = new AppError("INVALID_LOCATION", "Bad location");
    expect(err400.code).toBe("INVALID_LOCATION");
    expect(err400.statusCode).toBe(400);
    expect(err400.message).toBe("Bad location");

    const err404 = new AppError("LOCATION_NOT_FOUND", "Not found");
    expect(err404.statusCode).toBe(404);

    const err500 = new AppError("UNKNOWN_ERROR", "Server down");
    expect(err500.statusCode).toBe(500);
  });

  it("toErrorResponse formats AppError safely", () => {
    const error = new AppError("RATE_LIMITED", "Too many requests");
    const response = toErrorResponse(error);
    expect(response).toEqual({
      error: {
        code: "RATE_LIMITED",
        message: "Too many requests"
      }
    });
    // Ensure no stack trace
    expect(response.error).not.toHaveProperty("stack");
  });

  it("toErrorResponse formats unknown errors safely", () => {
    const error = new Error("Secret DB Error");
    const response = toErrorResponse(error);
    expect(response).toEqual({
      error: {
        code: "UNKNOWN_ERROR",
        message: "An unexpected error occurred"
      }
    });
    expect(response.error).not.toHaveProperty("stack");
  });
});
