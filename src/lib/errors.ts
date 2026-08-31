export type AppErrorCode =
  | "INVALID_LOCATION"
  | "LOCATION_NOT_FOUND"
  | "WEATHER_PROVIDER_UNAVAILABLE"
  | "WEATHER_RESPONSE_INVALID"
  | "RATE_LIMITED"
  | "UNKNOWN_ERROR";

export class AppError extends Error {
  public readonly code: AppErrorCode;
  public readonly statusCode: number;

  constructor(code: AppErrorCode, message: string, statusCode?: number) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.statusCode = statusCode ?? this.mapCodeToStatus(code);
    
    // Set prototype explicitly for extending Error in TS
    Object.setPrototypeOf(this, AppError.prototype);
  }

  private mapCodeToStatus(code: AppErrorCode): number {
    switch (code) {
      case "INVALID_LOCATION":
        return 400;
      case "LOCATION_NOT_FOUND":
        return 404;
      case "WEATHER_PROVIDER_UNAVAILABLE":
        return 502;
      case "WEATHER_RESPONSE_INVALID":
        return 422;
      case "RATE_LIMITED":
        return 429;
      case "UNKNOWN_ERROR":
      default:
        return 500;
    }
  }
}

export function toErrorResponse(error: unknown): { error: { code: string; message: string } } {
  if (error instanceof AppError) {
    return {
      error: {
        code: error.code,
        message: error.message,
      },
    };
  }
  
  return {
    error: {
      code: "UNKNOWN_ERROR",
      message: "An unexpected error occurred",
    },
  };
}
