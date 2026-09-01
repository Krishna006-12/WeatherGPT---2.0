export type AppErrorCode =
  | "INVALID_LOCATION"
  | "INVALID_REQUEST"
  | "LOCATION_NOT_FOUND"
  | "EVENT_NOT_FOUND"
  | "WEATHER_PROVIDER_UNAVAILABLE"
  | "WEATHER_RESPONSE_INVALID"
  | "FEED_SYNC_FAILED"
  | "SYNC_UNAUTHORIZED"
  | "SYNC_FORBIDDEN"
  | "AI_PROVIDER_UNAVAILABLE"
  | "AI_RESPONSE_INVALID"
  | "AI_RATE_LIMITED"
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
      case "INVALID_REQUEST":
        return 400;
      case "SYNC_UNAUTHORIZED":
        return 401;
      case "SYNC_FORBIDDEN":
        return 403;
      case "LOCATION_NOT_FOUND":
      case "EVENT_NOT_FOUND":
        return 404;
      case "WEATHER_RESPONSE_INVALID":
      case "AI_RESPONSE_INVALID":
        return 422;
      case "RATE_LIMITED":
      case "AI_RATE_LIMITED":
        return 429;
      case "WEATHER_PROVIDER_UNAVAILABLE":
      case "FEED_SYNC_FAILED":
      case "AI_PROVIDER_UNAVAILABLE":
        return 502;
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
