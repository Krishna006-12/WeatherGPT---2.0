/**
 * Shared utility types used across the application.
 */

/**
 * A discriminated union for operation results.
 * Prefer this over throwing exceptions for expected failure cases.
 */
export type Result<T, E = Error> =
  | { success: true; data: T }
  | { success: false; error: E };

/**
 * Generic paginated response wrapper.
 */
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

/**
 * ISO 8601 timestamp string.
 * Used for type documentation; runtime validation is done via Zod.
 */
export type ISOTimestamp = string;

/**
 * Geographic coordinates.
 */
export interface Coordinates {
  latitude: number;
  longitude: number;
}
