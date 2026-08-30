/**
 * Thin fetch wrapper with timeout, error normalization, and typed responses.
 *
 * Used by service adapters to call external APIs.
 * React components must never use this directly — they go
 * through TanStack Query hooks that call API routes.
 */

import type { Result } from '@/types/common';

/** Default request timeout in milliseconds. */
const DEFAULT_TIMEOUT_MS = 10_000;

export interface ApiClientOptions {
  baseUrl: string;
  timeout?: number;
  headers?: Record<string, string>;
}

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  headers?: Record<string, string>;
  body?: unknown;
  timeout?: number;
}

export class ApiClient {
  private baseUrl: string;
  private defaultTimeout: number;
  private defaultHeaders: Record<string, string>;

  constructor(options: ApiClientOptions) {
    this.baseUrl = options.baseUrl;
    this.defaultTimeout = options.timeout ?? DEFAULT_TIMEOUT_MS;
    this.defaultHeaders = options.headers ?? {};
  }

  /**
   * Make an HTTP request with timeout and error normalization.
   */
  async request<T>(path: string, options?: RequestOptions): Promise<Result<T>> {
    const url = `${this.baseUrl}${path}`;
    const timeout = options?.timeout ?? this.defaultTimeout;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, {
        method: options?.method ?? 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...this.defaultHeaders,
          ...options?.headers,
        },
        body: options?.body ? JSON.stringify(options.body) : undefined,
        signal: controller.signal,
      });

      if (!response.ok) {
        return {
          success: false,
          error: new Error(
            `HTTP ${response.status}: ${response.statusText}`
          ),
        };
      }

      const data = (await response.json()) as T;
      return { success: true, data };
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        return {
          success: false,
          error: new Error(`Request to ${url} timed out after ${timeout}ms`),
        };
      }

      return {
        success: false,
        error:
          error instanceof Error
            ? error
            : new Error('Unknown network error'),
      };
    } finally {
      clearTimeout(timeoutId);
    }
  }
}
